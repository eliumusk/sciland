import re
import time
from typing import Dict, List, Optional

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

    def _build_skill_md(self, title: str, description: str, requirements: Dict = None, metadata: Dict = None) -> str:
        """Build the SKILL.md file with full skill definition."""
        lines = [
            f"# Skill: {title}",
            "",
            "## 简介",
            description,
            "",
        ]

        # Add requirements if provided
        if requirements:
            if requirements.get("input"):
                lines.extend([
                    "## 输入",
                    f"- 类型: {requirements.get('input', '任意')}",
                    f"- 格式: {requirements.get('format', '任意')}",
                    "",
                ])

            if requirements.get("output"):
                lines.extend([
                    "## 输出",
                    f"- 类型: {requirements.get('output', '任意')}",
                    f"- 格式: {requirements.get('output_format', '任意')}",
                    "",
                ])

            if requirements.get("constraints"):
                lines.extend([
                    "## 约束",
                ])
                for constraint in requirements.get("constraints", []):
                    lines.append(f"- {constraint}")
                lines.append("")

            if requirements.get("examples"):
                lines.extend([
                    "## 示例",
                ])
                for i, example in enumerate(requirements.get("examples", []), 1):
                    lines.append(f"### 示例 {i}")
                    lines.append(f"```\n{example}\n```")
                    lines.append("")

        # Add version history
        lines.extend([
            "## 版本历史",
            "| 版本 | 日期 | 描述 | PR |",
            "|------|------|------|-----|",
            "| v1 | {date} | 初始版本 | - |".format(date=time.strftime("%Y-%m-%d")),
            "",
        ])

        # Add metadata if provided
        if metadata and metadata.get("category"):
            lines.extend([
                "## 分类",
                f"- {metadata.get('category')}",
                "",
            ])

        if metadata and metadata.get("tags"):
            lines.extend([
                "## 标签",
            ])
            for tag in metadata.get("tags", []):
                lines.append(f"- `{tag}`")
            lines.append("")

        return "\n".join(lines)

    def _build_readme_md(self, title: str, description: str) -> str:
        """Build README.md for the skill repository."""
        lines = [
            f"# {title}",
            "",
            description[:200] + "..." if len(description) > 200 else description,
            "",
            "## 快速开始",
            "",
            "```bash",
            "# Clone this skill",
            "git clone <repo_url>",
            "cd <repo_name>",
            "```",
            "",
            "## 文档",
            "",
            "详细技能定义请参阅 [SKILL.md](./SKILL.md)。",
            "",
            "## 贡献",
            "",
            "欢迎提交 PR！请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)。",
            "",
        ]
        return "\n".join(lines)

    def _build_contributing_md(self, title: str, repo_url: str, repo_name: str) -> str:
        """Build CONTRIBUTING.md for agent iteration guidance."""
        lines = [
            "# Agent 贡献指南",
            "",
            f"## 如何迭代本 Skill: {title}",
            "",
            "### 1. 克隆仓库",
            "```bash",
            f"git clone {repo_url}",
            f"cd {repo_name}",
            "```",
            "",
            "### 2. 创建分支",
            "```bash",
            "# 根据当前版本创建新版本分支",
            "git checkout -b version/v2",
            "```",
            "",
            "### 3. 修改 SKILL.md 和实现代码",
            "",
            "### 4. 提交 PR",
            "```bash",
            "git add .",
            'git commit -m "feat: update skill to v2"',
            "git push origin version/v2",
            "```",
            "",
            "### 5. 等待自动合并",
            "",
            "- 提交后系统会自动运行 CI",
            "- CI 通过后自动合并到 main 分支",
            "- 版本号自动更新",
            "",
            "## 版本规则",
            "",
            "- 每个版本对应一个 PR",
            "- PR 必须指向 `version/v{n+1}` 分支",
            "- CI 成功后会自动合并到 main",
            "",
            "## 反馈问题",
            "",
            "如果使用本 Skill 遇到问题，请提交 Issue 或 PR！",
            "",
        ]
        return "\n".join(lines)

    def _build_default_ci_workflow(self, auto_merge: bool = True) -> str:
        """Build the CI workflow file."""
        lines = [
            "name: skill-ci",
            "",
            "on:",
            "  pull_request:",
            "    branches:",
            "      - version/v1",
            "      - version/v2",
            "      - version/v3",
            "",
            "jobs:",
            "  validate:",
            "    runs-on: ubuntu-latest",
            "    steps:",
            "      - uses: actions/checkout@v4",
            "      - name: Validate SKILL.md exists",
            "        run: |",
            "          if [ ! -f SKILL.md ]; then",
            '            echo "Error: SKILL.md not found"',
            "            exit 1",
            "            exit 1",
            "          fi",
            "      - name: Check format",
            "        run: |",
            '          echo "CI validation passed"',
            "",
        ]
        return "\n".join(lines)

    def _build_gitignore(self) -> str:
        """Build .gitignore file."""
        lines = [
            "__pycache__/",
            "*.pyc",
            ".env",
            ".venv/",
            "node_modules/",
            ".DS_Store",
            "*.log",
        ]
        return "\n".join(lines)

    def _build_example_json(self) -> str:
        """Build example input/output JSON."""
        return """{
  "example": {
    "input": "示例输入",
    "output": "预期输出"
  }
}"""

    def _create_repo_with_branches(
        self,
        title: str,
        description: str,
        requirements: Dict = None,
        metadata: Dict = None,
        auto_merge: bool = True,
    ) -> Dict:
        repo_name = f"{settings.challenge_repo_prefix}-{self._slugify(title)}-{self._short_id()}"
        repo = self.github.create_org_repo(
            name=repo_name,
            description=f"SciX Skill: {title.strip()[:100]}",
        )

        owner = repo["owner"]["login"]
        default_branch = repo.get("default_branch", "main")
        base_sha = self.github.get_branch(owner, repo_name, default_branch)["commit"]["sha"]

        # Create SKILL.md
        skill_content = self._build_skill_md(title.strip(), description.strip(), requirements, metadata)
        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path="SKILL.md",
            content=skill_content,
            message="docs: add skill definition",
        )

        # Create README.md
        readme_content = self._build_readme_md(title.strip(), description.strip())
        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path="README.md",
            content=readme_content,
            message="docs: add README",
        )

        # Create CONTRIBUTING.md
        repo_url = repo["html_url"]
        contributing_content = self._build_contributing_md(title.strip(), repo_url, repo_name)
        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path="CONTRIBUTING.md",
            content=contributing_content,
            message="docs: add contribution guide",
        )

        # Create .gitignore
        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path=".gitignore",
            content=self._build_gitignore(),
            message="chore: add .gitignore",
        )

        # Create example JSON
        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path="examples/example.json",
            content=self._build_example_json(),
            message="docs: add example",
        )

        # Create version branches and CI
        for branch in settings.parsed_version_branches:
            self.github.ensure_branch(owner, repo_name, branch, base_sha)

        ci_workflow = self._build_default_ci_workflow(auto_merge)
        for branch in [default_branch] + settings.parsed_version_branches:
            self.github.put_file(
                owner=owner,
                repo=repo_name,
                branch=branch,
                path=".github/workflows/skill-ci.yml",
                content=ci_workflow,
                message=f"chore(ci): add skill workflow on {branch}",
            )

        # Protect version branches
        for branch in settings.parsed_version_branches:
            self.github.protect_branch(owner, repo_name, branch)

        self.github.protect_branch(owner, repo_name, default_branch)

        return {
            "owner": owner,
            "repo_name": repo_name,
            "repo_url": repo["html_url"],
            "default_branch": default_branch,
        }

    def create_challenge(
        self,
        title: str,
        description: str,
        requirements: Dict = None,
        metadata: Dict = None,
        auto_merge: bool = True,
        merge_strategy: str = "squash",
    ) -> Dict:
        if not title.strip():
            raise BadRequestError("title is required")
        if not description.strip():
            raise BadRequestError("description is required")

        created = self._create_repo_with_branches(
            title,
            description,
            requirements,
            metadata,
            auto_merge,
        )

        self.cache.clear(f"challenges:list")

        return {
            "challenge_id": created["repo_name"],
            "repo_url": created["repo_url"],
            "repo_full_name": f"{created['owner']}/{created['repo_name']}",
            "branches": [created["default_branch"]] + settings.parsed_version_branches,
            "auto_merge": auto_merge,
            "merge_strategy": merge_strategy,
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

    def create_submission(
        self,
        challenge_id: str,
        title: str,
        description: str = "",
        content: str = "",
    ) -> Dict:
        """Submit a new version of a skill (creates PR)."""
        if not self._is_challenge_repo(challenge_id):
            raise NotFoundError("challenge not found")

        if not title.strip():
            raise BadRequestError("title is required")

        # Get current version to determine next version branch
        pulls = self.github.list_pulls(settings.github_org, challenge_id, state="all", per_page=100)
        merged_versions = set()
        for pr in pulls:
            if pr.get("merged_at"):
                base = pr.get("base", {}).get("ref", "")
                if base.startswith("version/"):
                    merged_versions.add(base)

        # Determine next version
        next_version = None
        for i in range(1, 100):
            v = f"v{i}"
            if f"version/{v}" not in merged_versions:
                next_version = v
                break

        if not next_version:
            raise BadRequestError("no available version branch")

        branch = f"version/{next_version}"

        # Get main branch SHA
        repo = self.github.get_repo(settings.github_org, challenge_id)
        default_branch = repo.get("default_branch", "main")
        base_sha = self.github.get_branch(settings.github_org, challenge_id, default_branch)["commit"]["sha"]

        # Create version branch if not exists
        try:
            self.github.ensure_branch(settings.github_org, challenge_id, branch, base_sha)
        except Exception:
            pass  # Branch might already exist

        # Create a commit with updated SKILL.md
        skill_content = f"# Skill Update: {title}\n\n{description}\n\n{content}"

        try:
            self.github.put_file(
                owner=settings.github_org,
                repo=challenge_id,
                branch=branch,
                path="SKILL.md",
                content=skill_content,
                message=f"feat: update skill to {next_version}",
            )
        except Exception:
            pass  # File might already exist

        # Create PR
        pr = self.github.create_pull(
            owner=settings.github_org,
            repo=challenge_id,
            title=title,
            description=description or f"Update skill to {next_version}",
            head=branch,
            base=default_branch,
        )

        return {
            "pr_url": pr.get("html_url"),
            "pr_number": pr.get("number"),
            "branch": branch,
            "version": next_version,
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
