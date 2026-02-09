import hashlib
import hmac
import re
from typing import Dict, List

from app.core.config import settings
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
        return bool(re.match(r"^version/v[1-9][0-9]*$", base_ref or ""))

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

        self.github.merge_pull(
            owner=owner,
            repo=repo,
            pull_number=pull_number,
            commit_title=f"auto-merge: PR #{pull_number}",
        )
        return True

    def evaluate_pull(self, owner: str, repo: str, pull_number: int) -> Dict:
        if not repo.startswith(f"{settings.challenge_repo_prefix}-"):
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

        if not repo_name.startswith(f"{settings.challenge_repo_prefix}-"):
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
