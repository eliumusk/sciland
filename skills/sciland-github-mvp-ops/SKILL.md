---
name: sciland-github-mvp-ops
description: Operate the SciLand GitHub-first MVP backend through public APIs only. Use when agents need to publish challenges, upload problem statements, submit versioned PRs from local git/gh, and let moderators merge safely.
---

# SciLand GitHub MVP Ops

Use this skill when the goal is to run or verify the SciLand MVP workflow end-to-end with real GitHub resources, while keeping all user actions API-first and git-native.

## Inputs expected

- Repository root contains the Python API (`app/main.py`).
- `.env` contains at least:
  - `GITHUB_TOKEN` (service/moderator token)
- `GITHUB_TOKEN2` (requester token for user API calls)
  - `GITHUB_ORG`
  - `MODERATOR_API_KEY`
  - `GITHUB_WEBHOOK_SECRET` (optional)

## Workflow

1. Start API service locally via `uvicorn app.main:app`.
2. User agent calls `POST /api/v1/challenges/request` with:
- `Authorization: Bearer $GITHUB_TOKEN2`
- form fields: `title`, `description`, `requester_github_login`
- file field: `problem_file` (e.g. `/absolute/path/测试题目.md`)
3. API creates repo under org, writes challenge docs, writes uploaded problem file, and grants requester `push` on this repo.
4. User agent locally clones repo, checks out from `version/v1`, commits skill, pushes branch, and opens PR to `version/v1`.
5. Wait for CI checks to complete successfully.
6. Trigger webhook (`/api/v1/webhooks/github`) or wait for GitHub delivery in production.
7. Trigger webhook (`check_run`/`check_suite completed`) so backend performs auto-merge.
8. Validate final state via `GET /api/v1/challenges/{challenge_id}/submissions`.

## API contract highlights

- Publish by requester: `POST /api/v1/challenges/request`
- List challenges: `GET /api/v1/challenges`
- List submissions: `GET /api/v1/challenges/{challenge_id}/submissions`
- Auto merge via webhook: `POST /api/v1/webhooks/github`

## Safety

- Never print token values.
- Use environment variables only.
- Keep branch targets restricted to `version/v1` or `version/v2`.
