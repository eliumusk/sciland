import re
import time
from typing import Dict, List

from app.core.config import settings
from app.core.errors import BadRequestError, NotFoundError
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

    def _is_challenge_repo(self, repo_name: str) -> bool:
        return repo_name.startswith(f"{settings.challenge_repo_prefix}-")

    def _build_challenge_md(self, title: str, description: str) -> str:
        lines = [
            f"# {title}",
            "",
            description,
            "",
            "## Version Branches",
            "- version/v1",
            "- version/v2",
            "",
            "## Submission",
            "Create PR from your local clone to one of version branches.",
            "",
        ]
        return "\n".join(lines)

    def _build_default_ci_workflow(self) -> str:
        lines = [
            "name: skill-ci",
            "",
            "on:",
            "  pull_request:",
            "    branches:",
            "      - version/v1",
            "      - version/v2",
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

    def _create_repo_with_branches(self, title: str, description: str) -> Dict:
        repo_name = f"{settings.challenge_repo_prefix}-{self._slugify(title)}-{self._short_id()}"
        repo = self.github.create_org_repo(
            name=repo_name,
            description=f"SciLand challenge: {title.strip()}",
        )

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

        for branch in settings.parsed_version_branches:
            self.github.ensure_branch(owner, repo_name, branch, base_sha)

        ci_workflow = self._build_default_ci_workflow()
        for branch in [default_branch] + settings.parsed_version_branches:
            self.github.put_file(
                owner=owner,
                repo=repo_name,
                branch=branch,
                path=".github/workflows/skill-ci.yml",
                content=ci_workflow,
                message=f"chore(ci): add skill workflow on {branch}",
            )

        for branch in settings.parsed_version_branches:
            self.github.protect_branch(owner, repo_name, branch)

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

        created = self._create_repo_with_branches(title, description)

        self.cache.clear(f"challenges:list")

        return {
            "challenge_id": created["repo_name"],
            "repo_url": created["repo_url"],
            "branches": [created["default_branch"]] + settings.parsed_version_branches,
        }

    def create_challenge_for_requester(
        self,
        title: str,
        description: str,
        requester_github_login: str,
        problem_filename: str,
        problem_content: str,
    ) -> Dict:
        if not requester_github_login.strip():
            raise BadRequestError("requester_github_login is required")
        if not problem_filename.strip():
            raise BadRequestError("problem file name is required")
        if not problem_content.strip():
            raise BadRequestError("problem file content is required")

        created = self._create_repo_with_branches(title, description)

        safe_file = problem_filename.strip().replace("\\", "/").split("/")[-1] or "problem.md"
        self.github.put_file(
            owner=created["owner"],
            repo=created["repo_name"],
            branch=created["default_branch"],
            path=safe_file,
            content=problem_content,
            message=f"docs: add problem file {safe_file}",
        )

        self.github.add_repo_collaborator(
            owner=created["owner"],
            repo=created["repo_name"],
            username=requester_github_login.strip(),
            permission="push",
        )

        self.cache.clear("challenges:list")
        return {
            "challenge_id": created["repo_name"],
            "repo_url": created["repo_url"],
            "branches": [created["default_branch"]] + settings.parsed_version_branches,
            "requester": requester_github_login.strip(),
            "problem_file": safe_file,
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
            if not self._is_challenge_repo(name):
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
        if not self._is_challenge_repo(challenge_id):
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
            "version_branches": settings.parsed_version_branches,
            "recent_submissions": submissions,
        }

        self.cache.set(cache_key, detail)
        return detail

    def list_submissions(self, challenge_id: str) -> List[Dict]:
        if not self._is_challenge_repo(challenge_id):
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
