import base64
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings
from app.core.errors import GithubApiError, NotFoundError


class GithubClient:
    def __init__(self):
        self.base_url = settings.github_api_base.rstrip("/")
        self.org = settings.github_org
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {settings.github_token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "sciland-mvp-api",
            }
        )

    def _request(self, method: str, path: str, expected=(200,), json_body=None):
        url = f"{self.base_url}{path}"
        response = self.session.request(method=method, url=url, json=json_body, timeout=30)

        data = None
        if response.text:
            try:
                data = response.json()
            except Exception:
                data = {"raw": response.text}

        if response.status_code not in expected:
            message = data.get("message") if isinstance(data, dict) else "GitHub API error"
            if response.status_code == 404:
                raise NotFoundError(message or "resource not found")
            raise GithubApiError(message or "GitHub API error", response.status_code, data)

        return data

    def _request_with_token(self, token: str, method: str, path: str, expected=(200,), json_body=None):
        url = f"{self.base_url}{path}"
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "sciland-mvp-api",
        }
        response = requests.request(method=method, url=url, headers=headers, json=json_body, timeout=30)

        data = None
        if response.text:
            try:
                data = response.json()
            except Exception:
                data = {"raw": response.text}

        if response.status_code not in expected:
            message = data.get("message") if isinstance(data, dict) else "GitHub API error"
            if response.status_code == 404:
                raise NotFoundError(message or "resource not found")
            raise GithubApiError(message or "GitHub API error", response.status_code, data)

        return data

    def get_authenticated_user(self, token: str) -> Dict[str, Any]:
        return self._request_with_token(token, "GET", "/user")

    def create_org_repo(self, name: str, description: str) -> Dict[str, Any]:
        return self._request(
            "POST",
            f"/orgs/{self.org}/repos",
            expected=(201,),
            json_body={
                "name": name,
                "description": description,
                "private": False,
                "auto_init": True,
                "has_issues": True,
                "has_projects": False,
                "has_wiki": False,
            },
        )

    def get_repo(self, owner: str, repo: str) -> Dict[str, Any]:
        return self._request("GET", f"/repos/{owner}/{repo}")

    def list_org_repos(self) -> List[Dict[str, Any]]:
        repos = []
        page = 1
        while True:
            chunk = self._request("GET", f"/orgs/{self.org}/repos?per_page=100&page={page}")
            if not chunk:
                break
            repos.extend(chunk)
            if len(chunk) < 100:
                break
            page += 1
        return repos

    def list_branches(self, owner: str, repo: str, per_page: int = 100) -> List[Dict[str, Any]]:
        branches = []
        page = 1
        while True:
            chunk = self._request("GET", f"/repos/{owner}/{repo}/branches?per_page={per_page}&page={page}")
            if not chunk:
                break
            branches.extend(chunk)
            if len(chunk) < per_page:
                break
            page += 1
        return branches

    def get_branch(self, owner: str, repo: str, branch: str) -> Dict[str, Any]:
        return self._request("GET", f"/repos/{owner}/{repo}/branches/{branch}")

    def create_branch(self, owner: str, repo: str, branch: str, sha: str):
        return self._request(
            "POST",
            f"/repos/{owner}/{repo}/git/refs",
            expected=(201,),
            json_body={"ref": f"refs/heads/{branch}", "sha": sha},
        )

    def ensure_branch(self, owner: str, repo: str, branch: str, base_sha: str):
        try:
            self.get_branch(owner, repo, branch)
            return
        except NotFoundError:
            self.create_branch(owner, repo, branch, base_sha)

    def put_file(self, owner: str, repo: str, branch: str, path: str, content: str, message: str):
        encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
        encoded_path = "/".join(requests.utils.quote(segment, safe="") for segment in path.split("/"))
        return self._request(
            "PUT",
            f"/repos/{owner}/{repo}/contents/{encoded_path}",
            expected=(200, 201),
            json_body={
                "message": message,
                "branch": branch,
                "content": encoded,
            },
        )

    def protect_branch(self, owner: str, repo: str, branch: str):
        # Some org plans/repo settings may reject full protection. We fail-soft for MVP.
        try:
            self._request(
                "PUT",
                f"/repos/{owner}/{repo}/branches/{branch}/protection",
                json_body={
                    "required_status_checks": None,
                    "enforce_admins": False,
                    "required_pull_request_reviews": {
                        "required_approving_review_count": 0,
                        "dismiss_stale_reviews": False,
                        "require_code_owner_reviews": False,
                    },
                    "restrictions": None,
                    "allow_force_pushes": False,
                    "allow_deletions": False,
                    "required_linear_history": True,
                    "block_creations": False,
                    "required_conversation_resolution": False,
                    "lock_branch": False,
                },
            )
        except GithubApiError:
            return

    def list_pulls(self, owner: str, repo: str, state: str = "open", per_page: int = 30) -> List[Dict[str, Any]]:
        return self._request(
            "GET",
            f"/repos/{owner}/{repo}/pulls?state={state}&per_page={per_page}",
        )

    def get_pull(self, owner: str, repo: str, pull_number: int) -> Dict[str, Any]:
        return self._request("GET", f"/repos/{owner}/{repo}/pulls/{pull_number}")

    def merge_pull(self, owner: str, repo: str, pull_number: int, commit_title: str):
        return self._request(
            "PUT",
            f"/repos/{owner}/{repo}/pulls/{pull_number}/merge",
            json_body={
                "commit_title": commit_title,
                "merge_method": "squash",
            },
        )

    def add_repo_collaborator(self, owner: str, repo: str, username: str, permission: str = "push"):
        return self._request(
            "PUT",
            f"/repos/{owner}/{repo}/collaborators/{username}",
            expected=(201, 204),
            json_body={"permission": permission},
        )

    def get_check_runs(self, owner: str, repo: str, ref: str) -> Dict[str, Any]:
        return self._request("GET", f"/repos/{owner}/{repo}/commits/{ref}/check-runs")

    def list_check_suites_for_ref(self, owner: str, repo: str, ref: str) -> Dict[str, Any]:
        return self._request("GET", f"/repos/{owner}/{repo}/commits/{ref}/check-suites")

    def list_actions_runs(self, owner: str, repo: str, per_page: int = 50) -> Dict[str, Any]:
        return self._request("GET", f"/repos/{owner}/{repo}/actions/runs?per_page={per_page}")

    def approve_actions_run(self, owner: str, repo: str, run_id: int) -> bool:
        try:
            self._request("POST", f"/repos/{owner}/{repo}/actions/runs/{run_id}/approve", expected=(201, 202, 204))
            return True
        except GithubApiError:
            return False

    def approve_action_required_runs_for_sha(self, owner: str, repo: str, sha: str):
        try:
            runs = self.list_actions_runs(owner, repo, per_page=50).get("workflow_runs", [])
        except Exception:
            return
        for run in runs:
            if run.get("head_sha") != sha:
                continue
            if run.get("status") == "completed" and run.get("conclusion") == "action_required":
                run_id = run.get("id")
                if isinstance(run_id, int):
                    self.approve_actions_run(owner, repo, run_id)

    def get_repo_readme(self, owner: str, repo: str) -> Optional[str]:
        try:
            readme = self._request("GET", f"/repos/{owner}/{repo}/readme")
            if isinstance(readme, dict) and readme.get("content"):
                return base64.b64decode(readme["content"]).decode("utf-8", errors="ignore")
        except Exception:
            return None
        return None
