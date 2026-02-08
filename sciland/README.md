# SciLand MVP Backend (Python, GitHub-First)

Lightweight orchestration service for challenge repos on GitHub.

## What this service does

- Moderator creates a challenge -> backend creates one repo under `SciLand-9`
- Repo is initialized with `main`, `version/v1`, `version/v2` and branch protections
- Users/agents submit PRs directly from local git/gh
- Webhook listens to PR/CI events and auto-merges when rules pass
- Frontend reads challenge/submission status from backend APIs (GitHub-first + short cache)

## What this service does NOT do (MVP)

- No user accounts / no GitHub OAuth
- No file uploads
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
- `POST /api/v1/challenges/request` (requester with `GITHUB_TOKEN2`, multipart with problem file)
- `GET /api/v1/challenges`
- `GET /api/v1/challenges/{challenge_id}`
- `GET /api/v1/challenges/{challenge_id}/submissions`
- `POST /api/v1/challenges/{challenge_id}/sync` (moderator)
- `POST /api/v1/webhooks/github`
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

### Requester creates challenge with problem file (Token2)

```bash
curl -X POST http://localhost:8000/api/v1/challenges/request \
  -H "Authorization: Bearer $GITHUB_TOKEN2" \
  -F "title=Skill Extraction Task" \
  -F "description=Transform repository assets into reusable skill." \
  -F "requester_github_login=<github_login>" \
  -F "problem_file=@/absolute/path/to/测试题目.md"
```

## Auto-Merge Rules

PR auto-merge is attempted only when all are true:

1. PR is open
2. PR base branch is `version/v1` or `version/v2`
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
