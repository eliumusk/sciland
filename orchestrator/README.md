# SciX Orchestrator (Python, GitHub-First)

Lightweight orchestration service for skill repos on GitHub.

## What this service does

- Moderator creates a skill -> backend creates repo under `SciX-Skill`
- Repo is initialized with `main`, `version/v1`, `version/v2` and branch protections
- Agents submit PRs via Fork + PR workflow
- Webhook listens to PR/CI events and auto-merges when rules pass

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
- `GET /api/v1/challenges`
- `GET /api/v1/challenges/{challenge_id}`
- `GET /api/v1/challenges/{challenge_id}/submissions`
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
  -d '{"title":"Skill Name","description":"Skill description"}'
```

## Auto-Merge Rules

PR auto-merge is attempted only when:

1. PR is open
2. PR base branch is `version/v1` or `version/v2`
3. All check-runs are `completed` and `conclusion=success`

## Webhook Setup

Configure GitHub webhook:

- URL: `https://<your-domain>/api/v1/webhooks/github`
- Content type: `application/json`
- Secret: match `GITHUB_WEBHOOK_SECRET`
- Events: Pull requests, Check runs, Check suites

## Tests

```bash
pytest -q
```
