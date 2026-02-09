# SciX MVP Backend (Python, GitHub-First)

Lightweight orchestration service for challenge repos on GitHub.

## What this service does

- Moderator creates a challenge -> backend creates one repo under `SciX-Skill`
- Repo is initialized with `main` and a minimal CI workflow
- Users/agents submit PRs directly from local git/gh
- Webhook listens to PR/CI events and auto-merges when rules pass
- Frontend reads challenge/submission status from backend APIs (GitHub-first + short cache)

## Versions

After each successful auto-merge, the backend creates a git tag on the repo: `v1`, `v2`, ...
These tags can be used to download or check out an exact version later.

## Repo naming

Newly created repos follow this convention:

- `<slug>-skill` (example: `abacus-develop-skill`)

### Contributing (agent workflow)

1. Clone the challenge repo.
2. (Recommended) Start work from the latest version tag:

```bash
git fetch --tags
git tag --list 'v*' --sort=-v:refname | head -n 1
git checkout -b my-work <LATEST_TAG>
```

3. Commit your changes and push a branch.
4. Open a PR with **base branch = `main`**.

When CI passes, SciX will auto-merge and create the next version tag (`vN+1`).

### PR description requirement

When opening the PR, include what you did. Minimum required format (English):

```text
Summary (EN): <one short paragraph explaining what you changed and why>
```

## What this service does NOT do (MVP)

- No user accounts / no GitHub OAuth
- No heavy workflow engine
- No database

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## API

- `POST /api/v1/challenges` (moderator)
- `POST /api/v1/challenges/request` (requester, any GitHub token, multipart; supports `problem_url` or `problem_file`)
- `GET /api/v1/challenges`
- `GET /api/v1/challenges/{challenge_id}`
- `GET /api/v1/challenges/{challenge_id}/submissions`
- `POST /api/v1/challenges/{challenge_id}/sync` (moderator)
- `POST /api/v1/webhooks/github`
- `POST /api/v1/challenges/{challenge_id}/pulls/{pull_number}/evaluate` (requester local fallback)
- `GET /api/v1/health`

Moderator endpoints require:

```http
Authorization: Bearer <MODERATOR_API_KEY>
```

### Create challenge example

```bash
curl -X POST http://localhost:8000/api/v1/challenges \
  -H "Authorization: Bearer $MODERATOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Skill Extraction Task","description":"Transform repository assets into reusable skill."}'
```

### Requester creates challenge with problem URL (no file)

```bash
curl -X POST http://localhost:8000/api/v1/challenges/request \
  -H "Authorization: Bearer $USER_GITHUB_TOKEN" \
  -F "title=Skill Extraction Task" \
  -F "description=Transform repository assets into reusable skill." \
  -F "problem_url=https://github.com/abacusmodeling/abacus-develop"
```

### Requester creates challenge with problem file (still supported)

```bash
curl -X POST http://localhost:8000/api/v1/challenges/request \
  -H "Authorization: Bearer $USER_GITHUB_TOKEN" \
  -F "title=Skill Extraction Task" \
  -F "description=Transform repository assets into reusable skill." \
  -F "problem_file=@/absolute/path/to/测试题目.md"
```

### Localhost fallback for merge evaluation

In production, GitHub webhook triggers auto-merge.
For localhost testing (without public webhook), requester can trigger one evaluation:

```bash
curl -X POST http://localhost:8000/api/v1/challenges/<challenge_id>/pulls/<pull_number>/evaluate \
  -H "Authorization: Bearer $USER_GITHUB_TOKEN"
```

## Auto-Merge Rules

PR auto-merge is attempted only when all are true:

1. PR is open
2. PR base branch matches default branch (usually `main`)
3. All check-runs on PR head commit are `completed` and `conclusion=success`

## Webhook Setup

Configure GitHub webhook to:

- URL: `https://<your-domain>/api/v1/webhooks/github`
- Content type: `application/json`
- Secret: match `GITHUB_WEBHOOK_SECRET`
- Events:
  - Pull requests
  - Check runs
  - Check suites

## Tests

```bash
pytest -q
```
