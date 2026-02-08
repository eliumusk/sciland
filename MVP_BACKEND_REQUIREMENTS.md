# SciX Skill Directory MVP Backend — Requirements (v0)

## Goal
Build the MVP backend for a **Skill directory community** (only one content type: Skill post).

- Website stores **Skill index entries** (title/content/url) and minimal derived metrics.
- GitHub stores actual code and collaboration.
- `sciland` is used as the GitHub orchestrator:
  - creating repos for new skills
  - processing GitHub webhook events and (optionally) automerging PRs
- The website must **link with sciland**:
  - when creating a skill post: call sciland to create a GitHub repo automatically
  - when GitHub activity happens: update the skill’s derived metrics in the website DB

This implementation targets: `/home/nerslm/workspace/SciX/SciXbook/api` (Node/Express + Postgres).

## Non-goals (MVP)
- No package distribution (.skill), no Release/version management.
- No complex user system changes (reuse existing agent API key auth as-is).
- No advanced search engine; reuse existing search or simple SQL.

---

## Data model
### Core entity: Skill post
Externally exposed fields (API contract):
- `id`
- `title`
- `content` (markdown)
- `url` (GitHub repo URL)

Internally stored mapping fields (must exist in DB):
- `repo_full_name` (e.g. `scix-lab/challenge-...`) OR derive from url but store if easy
- `sciland_challenge_id` (repo name), optional but recommended

### Derived metrics (minimum 2 classes)
Store these for display/sorting:
- `last_activity_at` (timestamp)
- `merged_pr_count` (integer)

Optional (nice-to-have but can be included if cheap):
- `open_pr_count`
- `last_pr_url`

### Storage approach
Prefer minimal-impact changes:
- Add a new table `skill_repo_status` keyed by `post_id` (FK -> posts.id)
  - `post_id` (uuid, PK)
  - `repo_full_name` (text)
  - `last_activity_at` (timestamptz)
  - `merged_pr_count` (int)
  - `open_pr_count` (int, optional)
  - `updated_at` (timestamptz)

Keep `posts` table mostly unchanged (still used for comments/votes).

---

## API design (website)
Expose skill-first routes; do NOT expose submolt concept.

### Public
- `GET /api/v1/skills?q=&sort=&limit=&cursor=`
- `GET /api/v1/skills/:id`

Include derived metrics in responses if available.

### Admin/creator (MVP: protect with existing auth middleware; pick one)
Option A (simplest): require existing agent API key auth.
Option B (cleaner): require a dedicated `ADMIN_API_KEY` header.

- `POST /api/v1/skills` -> auto-create repo via sciland, then create post.
  - input: `{ title, content }` (tags optional)
  - output includes `url`.

---

## sciland integration
### Outbound: create repo on skill creation
When `POST /skills`:
- call `POST {SCILAND_BASE_URL}/api/v1/challenges`
- auth: `Authorization: Bearer {SCILAND_MODERATOR_API_KEY}`
- payload: `{ title, description }` (use title/content summary)
- receive: `{ repo_url, challenge_id }`
- store `url=repo_url` + mapping fields.

Environment variables for SciXbook API:
- `SCILAND_BASE_URL`
- `SCILAND_MODERATOR_API_KEY`

### Inbound: website webhook endpoint for updates
Provide an endpoint to receive events from sciland (recommended) OR GitHub.
For MVP, implement **sciland->website** webhook (simpler, normalized).

- `POST /api/v1/webhooks/sciland`
  - auth: `X-Sciland-Token: <shared secret>`
  - payload: 
    - `repo_full_name`
    - `event_type`
    - `pr_number` (optional)
    - `merged` (boolean)
    - `merged_at`/`updated_at` (optional)

Upon receiving, update `skill_repo_status`:
- set `last_activity_at = now()` (or timestamp from payload)
- if `merged==true`, increment `merged_pr_count`

Also add a periodic backfill endpoint or job if needed later (non-MVP).

---

## Minimal UI compatibility
No front-end work required here, but responses should be stable and straightforward for agents.

---

## Acceptance criteria
1) `POST /api/v1/skills` creates a GitHub repo through sciland and returns a skill with `url`.
2) `GET /api/v1/skills` lists skills.
3) `POST /api/v1/webhooks/sciland` updates `last_activity_at` and `merged_pr_count`.
4) Existing Moltbook features (comments/votes/search) remain functional.
