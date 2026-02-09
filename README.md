# SciLand MVP Backend (Python, GitHub-First)

Lightweight orchestration service for challenge repos on GitHub.

## What this service does

- Moderator creates a challenge -> backend creates one repo under `SciLand-9`
- Repo is initialized with `main` plus dynamic version branches (`version/v1..version/vN`) and branch protections
- Users/agents submit PRs directly from local git/gh
- Webhook listens to PR/CI events and auto-merges when rules pass
- Frontend reads challenge/submission status from backend APIs (GitHub-first + short cache)

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
- `POST /api/v1/challenges/request` (requester, any GitHub token, multipart with problem file)
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
  -d '{"title":"Skill Extraction Task","description":"Transform repository assets into reusable skill.","version_count":100}'
```

### Requester creates challenge with problem file (only user's token needed)

```bash
curl -X POST http://localhost:8000/api/v1/challenges/request \
  -H "Authorization: Bearer $USER_GITHUB_TOKEN" \
  -F "title=Skill Extraction Task" \
  -F "description=Transform repository assets into reusable skill." \
  -F "version_count=100" \
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
2. PR base branch matches `version/vN` (e.g. `version/v1`, `version/v100`)
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
