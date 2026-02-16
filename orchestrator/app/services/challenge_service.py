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
        """Build the SKILL.md file with comprehensive skill definition."""
        date = time.strftime("%Y-%m-%d")

        lines = [
            f"# Skill: {title}",
            "",
            f"> {description}",
            "",
            "## Table of Contents",
            "",
            "- [Overview](#overview)",
            "- [Prerequisites](#prerequisites)",
            "- [Installation](#installation)",
            "- [Core Concepts](#core-concepts)",
            "- [Quick Start](#quick-start)",
            "- [API Reference](#api-reference)",
            "- [Usage Examples](#usage-examples)",
            "- [Best Practices](#best-practices)",
            "- [Troubleshooting](#troubleshooting)",
            "- [Related Links](#related-links)",
            "",
            "---",
            "",
            "## Overview",
            "",
            description,
            "",
            "---",
            "",
            "## Prerequisites",
            "",
            "Before starting, ensure you have:",
            "",
            "```bash",
            "# List required environments and dependencies",
            "- Python >= 3.8",
            "- Other dependencies",
            "```",
            "",
            "---",
            "",
            "## Installation",
            "",
            "### Method 1: Direct Installation",
            "",
            "```bash",
            "# Installation command",
            "pip install xxx",
            "```",
            "",
            "### Method 2: From Source",
            "",
            "```bash",
            "# Clone and install",
            "git clone https://github.com/xxx/xxx.git",
            "cd xxx",
            "pip install -e .",
            "```",
            "",
            "### Environment Variables",
            "",
            "Configure as needed:",
            "",
            "| Variable | Description | Default |",
            "|----------|-------------|---------|",
            "| `XXX_API_KEY` | API Key | - |",
            "| `XXX_ENDPOINT` | API Endpoint | `https://api.xxx.com` |",
            "",
            "---",
            "",
            "## Core Concepts",
            "",
            "### Concept 1",
            "",
            "Explain core concept...",
            "",
            "### Concept 2",
            "",
            "Explain core concept...",
            "",
            "---",
            "",
            "## Quick Start",
            "",
            "```python",
            "# Minimal example",
            "import xxx",
            "",
            "# Initialize",
            "client = xxx.Client()",
            "",
            "# Basic operation",
            "result = client.xxx()",
            "print(result)",
            "```",
            "",
            "---",
            "",
            "## API Reference",
            "",
            "### `xxx.Client`",
            "",
            "Client class for interacting with xxx service.",
            "",
            "#### Parameters",
            "",
            "| Parameter | Type | Description |",
            "|-----------|------|-------------|",
            "| `api_key` | `str` | API Key |",
            "| `timeout` | `int` | Timeout in seconds |",
            "",
            "#### Methods",
            "",
            "##### `client.xxx()`",
            "",
            "Execute main operation.",
            "",
            "**Parameters:**",
            "- `param1` (`str`): Description of param1",
            "- `param2` (`int`, optional): Description of param2",
            "",
            "**Returns:**",
            "- `dict`: Result dictionary",
            "",
            "**Example:**",
            "```python",
            "result = client.xxx(param1=\"value\", param2=10)",
            "```",
            "",
            "---",
            "",
            "## Usage Examples",
            "",
            "### Example 1: Basic Usage",
            "",
            "```python",
            "# Detailed usage example",
            "from xxx import YYY",
            "",
            "# Create object",
            "obj = YYY(param=\"value\")",
            "",
            "# Execute operation",
            "result = obj.process()",
            "print(result)",
            "```",
            "",
            "### Example 2: Advanced Usage",
            "",
            "```python",
            "# Show more complex usage scenarios",
            "# ...",
            "```",
            "",
            "---",
            "",
            "## Best Practices",
            "",
            "1. **Practice 1**: Why to do this...",
            "2. **Practice 2**: Why to do this...",
            "3. **Practice 3**: Why to do this...",
            "",
            "---",
            "",
            "## Troubleshooting",
            "",
            "### Common Issues",
            "",
            "#### Issue 1",
            "",
            "**Symptom:** Describe the symptom",
            "",
            "**Solution:** Provide solution",
            "",
            "#### Issue 2",
            "",
            "**Symptom:** Describe the symptom",
            "",
            "**Solution:** Provide solution",
            "",
            "---",
            "",
            "## Related Links",
            "",
            "- [Official Documentation](URL)",
            "- [API Reference](URL)",
            "- [GitHub Repository](URL)",
            "- [Issue Tracker](URL)",
            "",
            "---",
            "",
            "## Version History",
            "",
            f"| Version | Date | Description |",
            f"|---------|------|-------------|",
            f"| v1 | {date} | Initial release |",
            "",
            "---",
            "",
            f"*Hosted by SciX Platform | Version: 1.0.0*",
            "",
        ]

        return "\n".join(lines)

    def _build_readme_md(self, title: str, description: str) -> str:
        """Build README.md for the skill repository."""
        lines = [
            f"# {title}",
            "",
            f"> {description}",
            "",
            "## Overview",
            "",
            f"This is a scientific computing skill package providing complete support for {title}.",
            "",
            "## Features",
            "",
            "- Feature 1: Detailed description",
            "- Feature 2: Detailed description",
            "- Feature 3: Detailed description",
            "",
            "## Quick Start",
            "",
            "```bash",
            "# Clone repository",
            "git clone https://github.com/SciX-Skill/<repo_name>.git",
            "cd <repo_name>",
            "",
            "# View full documentation",
            "cat SKILL.md",
            "```",
            "",
            "## Documentation Structure",
            "",
            "```",
            ".",
            "├── SKILL.md              # Complete skill definition",
            "├── README.md             # This file",
            "├── CONTRIBUTING.md       # Contribution guidelines",
            "├── references/           # Reference materials",
            "│   ├── workflows.md",
            "│   └── output-patterns.md",
            "└── scripts/             # Helper scripts",
            "    ├── validate.py",
            "    └── setup.py",
            "```",
            "",
            "## Documentation",
            "",
            "See [SKILL.md](./SKILL.md) for complete skill definition.",
            "",
            "## Contributing",
            "",
            "Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).",
            "",
            "## Version History",
            "",
            f"| Version | Description | Date |",
            f"|---------|-------------|------|",
            f"| v1 | Initial release | {time.strftime('%Y-%m-%d')} |",
            "",
            "## License",
            "",
            "MIT License",
            "",
            "## Contact",
            "",
            "- Issues: https://github.com/SciX-Skill/<repo_name>/issues",
            "",
        ]
        return "\n".join(lines)

    def _build_contributing_md(self, title: str, repo_url: str, repo_name: str, org: str) -> str:
        """Build CONTRIBUTING.md for agent iteration guidance using Fork + PR workflow."""
        lines = [
            "# Contributing Guide",
            "",
            f"Welcome! This guide explains how to contribute to {title}.",
            "",
            "This project uses Fork + PR workflow. No repository push permissions required.",
            "",
            "## Table of Contents",
            "",
            "- [Contribution Process](#contribution-process)",
            "- [Version Rules](#version-rules)",
            "- [Getting Specific Versions](#getting-specific-versions)",
            "- [Reporting Issues](#reporting-issues)",
            "",
            "---",
            "",
            "## Contribution Process",
            "",
            "### 1. Fork the Repository",
            "",
            "Click the **Fork** button in the top-right corner of the repository page.",
            "",
            "### 2. Clone Your Fork",
            "",
            "```bash",
            f"git clone https://github.com/<YOUR_USERNAME>/{repo_name}.git",
            f"cd {repo_name}",
            "```",
            "",
            "### 3. Create a Development Branch",
            "",
            "```bash",
            "# Create a new branch based on main",
            "git checkout -b fix/xxx  # or feature/xxx",
            "```",
            "",
            "### 4. Make Changes and Commit",
            "",
            "```bash",
            "git add .",
            'git commit -m "Describe your changes"',
            "git push origin fix/xxx",
            "```",
            "",
            "### 5. Create a Pull Request",
            "",
            "1. Open your forked repository page",
            "2. Click **Compare & pull request**",
            "3. Ensure base is `main`",
            "4. Fill in the PR description and submit",
            "",
            "### 6. Wait for CI and Auto-Merge",
            "",
            "- CI checks will run automatically after submission",
            "- PR will be auto-merged when CI passes",
            "- Version branch will be created/updated after merge",
            "",
            "---",
            "",
            "## Version Rules",
            "",
            "| Version | Created When |",
            "|---------|--------------|",
            "| `version/v1` | After first PR is merged |",
            "| `version/v2` | After second PR is merged |",
            "| `version/v3` | After third PR is merged |",
            "",
            "Each PR merged to main will automatically create/update the next version branch.",
            "",
            "---",
            "",
            "## Getting Specific Versions",
            "",
            "```bash",
            "# Clone latest development version",
            f"git clone https://github.com/SciX-Skill/{repo_name}.git",
            f"cd {repo_name}",
            "",
            "# Switch to specific version",
            "git checkout version/v1",
            "",
            "# List all version branches",
            "git fetch origin",
            "git branch -r",
            "",
            "# Switch to another version",
            "git checkout version/v2",
            "```",
            "",
            "---",
            "",
            "## Reporting Issues",
            "",
            "If you encounter issues with this skill, please open an issue:",
            f"https://github.com/{org}/{repo_name}/issues",
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
            "      - main",
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
            "          fi",
            "      - name: Check format",
            "        run: |",
            '          if ! grep -q "^# Skill:" SKILL.md; then',
            '            echo "Error: SKILL.md must start with # Skill:"',
            "            exit 1",
            "          fi",
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
        # 仓库名：使用技能标题 + -skill 后缀
        repo_name = f"{self._slugify(title)}-skill"
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
        contributing_content = self._build_contributing_md(title.strip(), repo_url, repo_name, owner)
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

        # 只在 main 分支创建 CI workflow（不在预先创建 v1, v2, v3 分支）
        ci_workflow = self._build_default_ci_workflow(auto_merge)
        self.github.put_file(
            owner=owner,
            repo=repo_name,
            branch=default_branch,
            path=".github/workflows/skill-ci.yml",
            content=ci_workflow,
            message=f"chore(ci): add skill workflow",
        )

        # 保护 main 分支
        self.github.protect_branch(owner, repo_name, default_branch)

        # 创建 version/v1 分支（基于 main）
        self.github.ensure_branch(owner, repo_name, "version/v1", base_sha)
        self.github.protect_branch(owner, repo_name, "version/v1")

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

        # Note: No collaborator added - using Fork + PR workflow instead
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
