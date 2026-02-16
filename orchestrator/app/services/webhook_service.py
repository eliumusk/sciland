import hashlib
import hmac
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
        # PR 指向 main（首次）或 version/v* 时自动合并
        return base_ref == "main" or base_ref.startswith("version/v")

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

    def _get_next_version(self, owner: str, repo: str) -> int:
        """获取下一个版本号"""
        try:
            branches = self.github.list_branches(owner, repo)
            existing_versions = []
            for branch in branches:
                name = branch.get("name", "")
                if name.startswith("version/v"):
                    try:
                        v = int(name.split("/")[-1].replace("v", ""))
                        existing_versions.append(v)
                    except ValueError:
                        pass
            if not existing_versions:
                return 1
            return max(existing_versions) + 1
        except Exception:
            return 1

    def _revert_main(self, owner: str, repo: str, sha: str) -> None:
        """ revert main 到指定 SHA"""
        try:
            import requests
            # Force push main back to the previous SHA
            url = f"https://api.github.com/repos/{owner}/{repo}/git/refs/heads/main"
            response = requests.patch(
                url,
                headers={"Authorization": f"Bearer {self.github.token}"},
                json={"sha": sha, "force": True},
                timeout=10
            )
            if response.status_code == 200:
                print(f"Reverted main to {sha}")
            else:
                print(f"Failed to revert main: {response.text}")
        except Exception as e:
            print(f"Failed to revert main: {e}")

    def _create_next_version_branch(self, owner: str, repo: str, base_ref: str, current_sha: str) -> None:
        """创建下一个 version 分支（基于 PR 指向的分支）"""
        try:
            # PR 到 main 时，创建 version/v1
            # PR 到 version/vN 时，创建 version/v(N+1)
            if base_ref == "main":
                next_version = 1
            else:
                current_version = int(base_ref.split("/")[-1].replace("v", ""))
                next_version = current_version + 1

            # 用合并后的 SHA 创建下一个 version 分支
            self.github.ensure_branch(owner, repo, f"version/v{next_version}", current_sha)

            # 保护 version 分支
            self.github.protect_branch(owner, repo, f"version/v{next_version}")

            print(f"Created version/v{next_version}")
        except Exception as e:
            print(f"Failed to create version branch: {e}")

    def _enable_auto_merge_and_version(self, owner: str, repo: str, pull_number: int) -> bool:
        """启用 PR 自动合并，并创建下一个 version 分支"""
        pr = self.github.get_pull(owner, repo, pull_number)

        if pr.get("state") != "open":
            return False

        base_ref = pr["base"]["ref"]
        if not self._is_allowed_base(base_ref):
            return False

        # 检查 CI 是否通过
        head_sha = pr["head"]["sha"]
        if not self._is_ci_success(owner, repo, head_sha):
            return False

        # 启用 GitHub 自动合并
        try:
            self.github.enable_auto_merge(owner, repo, pull_number)
            print(f"Enabled auto-merge for PR #{pull_number}")
        except Exception as e:
            print(f"Failed to enable auto-merge: {e}")
            return False

        # 获取合并后的 SHA 来创建下一个 version 分支
        try:
            merged_pr = self.github.get_pull(owner, repo, pull_number)
            merged_sha = merged_pr.get("merge_commit_sha")
            if merged_sha:
                self._create_next_version_branch(owner, repo, base_ref, merged_sha)
        except Exception as e:
            print(f"Failed to get merged SHA: {e}")

        return True

        return True

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

        # 新仓库命名规则：xxx-skill（如 abacus-skill）
        if not repo_name.endswith("-skill"):
            return {"ok": True, "action": action, "processed": False}

        merged = False

        if event == "pull_request" and action in {"opened", "synchronize", "reopened"}:
            pull_number = payload.get("pull_request", {}).get("number")
            if isinstance(pull_number, int):
                merged = self._enable_auto_merge_and_version(owner, repo_name, pull_number)

        elif event in {"check_run", "check_suite"} and action == "completed":
            for number in self._collect_pr_numbers_from_check_event(payload):
                if self._enable_auto_merge_and_version(owner, repo_name, number):
                    merged = True

        elif event == "pull_request" and action == "closed":
            merged = bool(payload.get("pull_request", {}).get("merged"))

        self.cache.clear("challenges:list")
        self.cache.clear(f"challenge:detail:{repo_name}")

        return {"ok": True, "action": action, "processed": True, "merged": merged}
