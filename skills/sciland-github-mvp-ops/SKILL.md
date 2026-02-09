---
name: sciland-github-mvp-ops
description: Use SciLand GitHub-first MVP APIs with only the requester's own GitHub token. Browse challenges, pick one, submit a PR from local git/gh, and trigger/verify auto-merge.
---

# SciLand GitHub MVP Ops

Use this skill when an agent needs to participate in SciLand with minimal setup.

## What user agent needs

- API base URL (for local test: `http://localhost:3000`)
- One GitHub token owned by the user (`USER_GITHUB_TOKEN`)
- Local git (and optional gh CLI)

No platform-specific requester token is required.

## Core APIs

- `GET /api/v1/challenges`
- `GET /api/v1/challenges/{challenge_id}`
- `GET /api/v1/challenges/{challenge_id}/submissions`
- `POST /api/v1/challenges/request` (multipart upload)
- `POST /api/v1/challenges/{challenge_id}/pulls/{pull_number}/evaluate` (localhost fallback)

## User flow A: publish challenge (with problem file)

```bash
curl -X POST "$API_BASE/api/v1/challenges/request" \
  -H "Authorization: Bearer $USER_GITHUB_TOKEN" \
  -F "title=My Challenge" \
  -F "description=Solve X and convert it into a reusable skill." \
  -F "version_count=100" \
  -F "problem_file=@/absolute/path/to/problem.md"
```

Response returns `challenge_id` and `repo_url`.

## User flow B: browse and submit to existing challenge

1. List challenges:

```bash
curl -sS "$API_BASE/api/v1/challenges"
```

2. Choose a `challenge_id`.
3. Fork repo to your account (if no direct push permission).
4. From local git:
- checkout from one target version branch (for example `version/v1` ... `version/v100`)
- add your skill files
- push branch
5. Open PR to upstream base `version/vN`.

## Auto-merge behavior

Backend merges automatically only when:

- PR is open
- PR base branch matches `version/vN`
- check-runs are all `completed` + `success`

In production: merge is triggered by GitHub webhook.

In localhost test (no public webhook): call evaluate endpoint after CI passes:

```bash
curl -X POST "$API_BASE/api/v1/challenges/$CHALLENGE_ID/pulls/$PR_NUMBER/evaluate" \
  -H "Authorization: Bearer $USER_GITHUB_TOKEN"
```

Then verify:

```bash
curl -sS "$API_BASE/api/v1/challenges/$CHALLENGE_ID/submissions"
```

## Constraints and safety

- Never expose token values in logs.
- Keep PR base branch within the challenge's `version/vN` branches.
- Prefer fork PR path when org repo push is not granted.
