import re
import time
from typing import Dict, List

from app.core.config import settings
from app.core.errors import BadRequestError, GithubApiError, NotFoundError
from app.services.cache_store import CacheStore
from app.services.github_client import GithubClient


class ChallengeService:
    def __init__(self, github: GithubClient, cache: CacheStore):
        self.github = github
        self.cache = cache

    def _slugify(self, text: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower().strip())
        slug = re.sub(r"(^-|-$)", "", slug)
        return slug[:50] or "challenge"

    def _short_id(self) -> str:
        return format(int(time.time() * 1000), "x")[-6:]

    def _is_skill_repo(self, repo_name: str) -> bool:
        # Strict naming: "<slug>-skill"
        return bool(re.match(r"^[a-z0-9][a-z0-9-]*-skill$", repo_name or ""))

    def _extract_version_branches_from_repo(self, owner: str, repo: str) -> List[str]:
        branches = self.github.list_branches(owner, repo, per_page=100)
        names = [item.get("name", "") for item in branches]
        version_branches = []
        for name in names:
            if re.match(r"^version/v[1-9][0-9]*$", name):
                version_branches.append(name)
        version_branches.sort(key=lambda x: int(x.replace("version/v", "", 1)))
        return version_branches

    def _build_challenge_md(self, title: str, description: str) -> str:
        lines = [
            f"# {title}",
            "",
            description,
            "",
            "## Submission",
            "Create a PR to the default branch (usually `main`).",
            "",
            "## Versions",
            "After each successful auto-merge, the backend creates a git tag: `v1`, `v2`, ...",
            "You can download a specific version from GitHub Tags, or via git:",
            "- `git fetch --tags`",
            "- `git checkout v1`",
            "",
        ]
        return "\n".join(lines)

    def _build_default_ci_workflow(self, default_branch: str) -> str:
        lines = [
            "name: skill-ci",
            "",
            "on:",
            "  pull_request:",
            "    branches:",
            f"      - {default_branch}",
            "",
            "jobs:",
            "  validate:",
            "    runs-on: ubuntu-latest",
            "    steps:",
            "      - uses: actions/checkout@v4",
            "      - run: echo \"skill ci ok\"",
            "",
        ]
        return "\n".join(lines)

    def _create_repo(self, title: str, description: str) -> Dict:
        # New naming scheme includes the marker word (default: "skill") to make intent obvious.
        # Example: "abacus-develop-skill"
        repo_name = f"{self._slugify(title)}-skill"
        try:
            repo = self.github.create_org_repo(
                name=repo_name,
                description=f"SciX challenge: {title.strip()}",
            )
        except GithubApiError as exc:
            # Most common: 422 "name already exists on this account"
            raise BadRequestError(f"failed to create repo {repo_name}", details=exc.details)

        owner = repo["owner"]["login"]
        default_branch = repo.get("default_branch", "main")
        base_sha = self.github.get_branch(owner, repo_name, default_branch)["commit"]["sha"]

        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path="CHALLENGE.md",
            content=self._build_challenge_md(title.strip(), description.strip()),
            message="docs: add challenge",
        )

        ci_workflow = self._build_default_ci_workflow(default_branch)
        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path=".github/workflows/skill-ci.yml",
            content=ci_workflow,
            message="chore(ci): add skill workflow",
        )

        self.github.protect_branch(owner, repo_name, default_branch)
        return {
            "owner": owner,
            "repo_name": repo_name,
            "repo_url": repo["html_url"],
            "default_branch": default_branch,
        }

    def create_challenge(self, title: str, description: str) -> Dict:
        if not title.strip():
            raise BadRequestError("title is required")
        if not description.strip():
            raise BadRequestError("description is required")

        created = self._create_repo(title, description)

        self.cache.clear(f"challenges:list")

        return {
            "challenge_id": created["repo_name"],
            "repo_url": created["repo_url"],
            "branches": [created["default_branch"]],
        }

    def create_challenge_for_requester(
        self,
        title: str,
        description: str,
        requester_token: str,
        problem_filename: str,
        problem_content: str,
    ) -> Dict:
        if not requester_token.strip():
            raise BadRequestError("requester token is required")
        if not problem_filename.strip():
            raise BadRequestError("problem file name is required")
        if not problem_content.strip():
            raise BadRequestError("problem file content is required")

        requester = self.github.get_authenticated_user(requester_token)
        requester_login = requester.get("login", "").strip()
        if not requester_login:
            raise BadRequestError("unable to resolve requester from token")

        created = self._create_repo(title, description)

        safe_file = problem_filename.strip().replace("\\", "/").split("/")[-1] or "problem.md"
        self.github.put_file(
            owner=created["owner"],
            repo=created["repo_name"],
            branch=created["default_branch"],
            path=safe_file,
            content=problem_content,
            message=f"docs: add problem file {safe_file}",
        )

        collaborator_granted = False
        try:
            self.github.add_repo_collaborator(
                owner=created["owner"],
                repo=created["repo_name"],
                username=requester_login,
                permission="push",
            )
            collaborator_granted = True
        except Exception:
            # Some org policies force fork-only contribution. We keep flow working via fork+PR.
            collaborator_granted = False

        self.cache.clear("challenges:list")
        return {
            "challenge_id": created["repo_name"],
            "repo_url": created["repo_url"],
            "branches": [created["default_branch"]],
            "requester": requester_login,
            "problem_file": safe_file,
            "collaborator_granted": collaborator_granted,
        }

    def list_challenges(self) -> List[Dict]:
        cache_key = "challenges:list"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        repos = self.github.list_org_repos()
        items = []
        for repo in repos:
            name = repo.get("name", "")
            if not self._is_skill_repo(name):
                continue
            items.append(
                {
                    "challenge_id": name,
                    "title": repo.get("description") or name,
                    "repo_url": repo.get("html_url"),
                    "default_branch": repo.get("default_branch", "main"),
                }
            )

        self.cache.set(cache_key, items)
        return items

    def get_challenge_detail(self, challenge_id: str) -> Dict:
        if not self._is_skill_repo(challenge_id):
            raise NotFoundError("challenge not found")

        cache_key = f"challenge:detail:{challenge_id}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        repo = self.github.get_repo(settings.github_org, challenge_id)
        pulls = self.github.list_pulls(settings.github_org, challenge_id, state="all", per_page=20)

        submissions = []
        for pr in pulls:
            status = "merged" if pr.get("merged_at") else pr.get("state", "open")
            submissions.append(
                {
                    "number": pr["number"],
                    "title": pr["title"],
                    "url": pr["html_url"],
                    "base_ref": pr["base"]["ref"],
                    "head_ref": pr["head"]["ref"],
                    "status": status,
                    "merged": bool(pr.get("merged_at")),
                }
            )

        detail = {
            "challenge_id": challenge_id,
            "title": repo.get("description") or challenge_id,
            "description": self.github.get_repo_readme(settings.github_org, challenge_id),
            "repo_url": repo["html_url"],
            "default_branch": repo.get("default_branch", "main"),
            "version_branches": self._extract_version_branches_from_repo(settings.github_org, challenge_id),
            "recent_submissions": submissions,
        }

        self.cache.set(cache_key, detail)
        return detail

    def list_submissions(self, challenge_id: str) -> List[Dict]:
        if not self._is_skill_repo(challenge_id):
            raise NotFoundError("challenge not found")

        pulls = self.github.list_pulls(settings.github_org, challenge_id, state="all", per_page=100)
        items = []
        for pr in pulls:
            items.append(
                {
                    "number": pr["number"],
                    "title": pr["title"],
                    "url": pr["html_url"],
                    "base_ref": pr["base"]["ref"],
                    "head_ref": pr["head"]["ref"],
                    "status": "merged" if pr.get("merged_at") else pr.get("state", "open"),
                    "merged": bool(pr.get("merged_at")),
                }
            )
        return items

    def sync_challenge(self, challenge_id: str) -> Dict:
        submissions = self.list_submissions(challenge_id)
        self.cache.clear(f"challenge:detail:{challenge_id}")
        self.cache.clear(f"submissions:{challenge_id}")
        return {
            "challenge_id": challenge_id,
            "synced": True,
            "submission_count": len(submissions),
        }

    def requester_can_operate_pull(self, challenge_id: str, pull_number: int, requester_token: str) -> bool:
        if not self._is_skill_repo(challenge_id):
            raise NotFoundError("challenge not found")
        if pull_number <= 0:
            raise BadRequestError("pull number must be positive")
        requester = self.github.get_authenticated_user(requester_token)
        requester_login = requester.get("login", "")
        if not requester_login:
            return False

        pr = self.github.get_pull(settings.github_org, challenge_id, pull_number)
        author_login = (pr.get("user") or {}).get("login", "")
        head_owner_login = ((pr.get("head") or {}).get("repo") or {}).get("owner", {}).get("login", "")
        return requester_login in {author_login, head_owner_login}
