import hashlib
import hmac
import re
from typing import Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.errors import GithubApiError
from app.services.cache_store import CacheStore
from app.services.github_client import GithubClient


class WebhookService:
    def __init__(self, github: GithubClient, cache: CacheStore):
        self.github = github
        self.cache = cache

    def verify_signature(self, body: bytes, signature_header: str) -> bool:
        if not settings.webhook_secret:
            return True
        if not signature_header.startswith("sha256="):
            return False

        digest = hmac.new(
            settings.webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        expected = f"sha256={digest}"
        return hmac.compare_digest(signature_header, expected)

    def _is_allowed_base(self, base_ref: str) -> bool:
        # Linear model: only auto-merge PRs targeting the default branch.
        # We allow both main/master for compatibility with older repos.
        return (base_ref or "") in {"main", "master"}

    def _is_ci_success(self, owner: str, repo: str, sha: str) -> bool:
        checks = self.github.get_check_runs(owner, repo, sha)
        runs = checks.get("check_runs", []) if isinstance(checks, dict) else []
        if not runs:
            return False

        for run in runs:
            if run.get("status") != "completed":
                return False
            if run.get("conclusion") != "success":
                return False
        return True

    def _compute_next_version_tag(self, owner: str, repo: str) -> str:
        # Tags are used as "downloadable versions" (v1, v2, ...). We keep it simple:
        # pick max existing vN and create v(N+1).
        tags = self.github.list_tags(owner, repo, per_page=100)
        max_n = 0
        for item in tags:
            name = (item or {}).get("name", "")
            m = re.match(r"^v([1-9][0-9]*)$", name)
            if not m:
                continue
            n = int(m.group(1))
            if n > max_n:
                max_n = n
        return f"v{max_n + 1}"

    def _find_existing_version_tag_for_sha(self, tags: List[Dict], sha: str) -> Optional[str]:
        for item in tags:
            name = (item or {}).get("name", "")
            m = re.match(r"^v([1-9][0-9]*)$", name)
            if not m:
                continue
            commit = (item or {}).get("commit") or {}
            if (commit.get("sha") or "") == sha:
                return name
        return None

    def _tag_merge_version(self, owner: str, repo: str, sha: str) -> Tuple[Optional[str], bool]:
        # Create a semantic version tag (v1, v2, ...) for the merged commit.
        # Idempotent per commit sha: if sha already has a vN tag, return it and do not create a new one.
        for _ in range(5):
            tags = self.github.list_tags(owner, repo, per_page=100)
            existing = self._find_existing_version_tag_for_sha(tags, sha)
            if existing:
                return existing, False

            tag = self._compute_next_version_tag(owner, repo)
            try:
                self.github.create_tag(owner, repo, tag, sha)
                return tag, True
            except GithubApiError as exc:
                # 422 commonly means "Reference already exists" (racy tag name).
                if exc.status_code == 422:
                    continue
                return None, False

        return None, False

    def _extract_summary_en(self, pr_body: str) -> str:
        # Require agents to include an English summary in PR body for community-facing announcements.
        # Supported formats:
        # - "Summary (EN): ...."
        # - Heading "## Summary (EN)" followed by text lines
        body = (pr_body or "").strip()
        if not body:
            return ""

        m = re.search(r"(?im)^summary\\s*\\(en\\)\\s*:\\s*(.+)$", body)
        if m:
            return m.group(1).strip()[:500]

        m = re.search(r"(?is)^##\\s+summary\\s*\\(en\\)\\s*\\n+(.+?)(\\n##\\s+|\\Z)", body)
        if m:
            return re.sub(r"\\s+", " ", m.group(1).strip())[:500]

        return ""

    def _build_version_comment(self, pr_user: str, tag: str, summary_en: str, sha: str) -> str:
        marker = f"<!-- scix:version-tag {tag} sha={sha} -->"
        lines = [
            marker,
            f"User `{pr_user or 'unknown'}` has uploaded version **{tag}**.",
        ]
        if summary_en:
            lines.append("")
            lines.append("Summary (EN):")
            lines.append(summary_en)
        else:
            lines.append("")
            lines.append("Summary (EN): (missing) Please include `Summary (EN): ...` in the PR description next time.")
        return "\n".join(lines) + "\n"

    def _post_version_comment_if_missing(self, owner: str, repo: str, pr_number: int, tag: str, sha: str, pr_user: str, summary_en: str):
        marker = f"<!-- scix:version-tag {tag} sha={sha} -->"
        try:
            comments = self.github.list_issue_comments(owner, repo, pr_number, per_page=100)
        except Exception:
            comments = []
        for c in comments or []:
            if marker in ((c or {}).get("body") or ""):
                return
        self.github.create_issue_comment(owner, repo, pr_number, self._build_version_comment(pr_user, tag, summary_en, sha))

    def _is_skill_repo(self, repo_name: str) -> bool:
        return bool(re.match(r"^[a-z0-9][a-z0-9-]*-skill$", repo_name or ""))

    def _try_auto_merge(self, owner: str, repo: str, pull_number: int) -> bool:
        pr = self.github.get_pull(owner, repo, pull_number)

        if pr.get("state") != "open":
            return False
        if not self._is_allowed_base(pr["base"]["ref"]):
            return False

        head_sha = pr["head"]["sha"]
        self.github.approve_action_required_runs_for_sha(owner, repo, head_sha)
        if not self._is_ci_success(owner, repo, head_sha):
            return False

        merge_result = self.github.merge_pull(
            owner=owner,
            repo=repo,
            pull_number=pull_number,
            commit_title=f"auto-merge: PR #{pull_number}",
        )
        merged_sha = ""
        if isinstance(merge_result, dict):
            merged_sha = merge_result.get("sha") or ""
        final_sha = merged_sha or head_sha
        tag, _created = self._tag_merge_version(owner, repo, final_sha)
        if tag:
            pr_user = ((pr or {}).get("user") or {}).get("login") or ""
            summary_en = self._extract_summary_en((pr or {}).get("body") or "")
            try:
                self._post_version_comment_if_missing(owner, repo, pull_number, tag, final_sha, pr_user, summary_en)
            except Exception:
                # fail-soft; merge already happened
                pass
        return True

    def evaluate_pull(self, owner: str, repo: str, pull_number: int) -> Dict:
        if not self._is_skill_repo(repo):
            return {"ok": True, "processed": False, "merged": False}
        merged = self._try_auto_merge(owner, repo, pull_number)
        self.cache.clear("challenges:list")
        self.cache.clear(f"challenge:detail:{repo}")
        return {"ok": True, "processed": True, "merged": merged}

    def _collect_pr_numbers_from_check_event(self, payload: Dict) -> List[int]:
        prs = payload.get("check_run", {}).get("pull_requests", [])
        if not prs:
            prs = payload.get("check_suite", {}).get("pull_requests", [])

        result = []
        for pr in prs:
            number = pr.get("number")
            if isinstance(number, int):
                result.append(number)
        return result

    def process(self, event: str, payload: Dict) -> Dict:
        action = payload.get("action", "")

        repo = payload.get("repository", {})
        repo_name = repo.get("name", "")
        owner = repo.get("owner", {}).get("login", settings.github_org)

        if not self._is_skill_repo(repo_name):
            return {"ok": True, "action": action, "processed": False}

        merged = False

        if event == "pull_request" and action in {"opened", "synchronize", "reopened"}:
            pull_number = payload.get("pull_request", {}).get("number")
            if isinstance(pull_number, int):
                merged = self._try_auto_merge(owner, repo_name, pull_number)

        elif event in {"check_run", "check_suite"} and action == "completed":
            for number in self._collect_pr_numbers_from_check_event(payload):
                if self._try_auto_merge(owner, repo_name, number):
                    merged = True

        elif event == "pull_request" and action == "closed":
            merged = bool(payload.get("pull_request", {}).get("merged"))

        self.cache.clear("challenges:list")
        self.cache.clear(f"challenge:detail:{repo_name}")

        return {"ok": True, "action": action, "processed": True, "merged": merged}
