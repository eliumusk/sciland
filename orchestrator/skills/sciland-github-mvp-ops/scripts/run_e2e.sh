#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

set -a
source .env
set +a

required=(GITHUB_TOKEN GITHUB_TOKEN2 GITHUB_ORG MODERATOR_API_KEY)
for k in "${required[@]}"; do
  if [[ -z "${!k:-}" ]]; then
    echo "missing env: $k" >&2
    exit 1
  fi
done

PORT_VAL="${PORT:-8013}"
HOST_VAL="127.0.0.1"
BASE_URL="http://${HOST_VAL}:${PORT_VAL}"

python3 -m uvicorn app.main:app --host "$HOST_VAL" --port "$PORT_VAL" >/tmp/sciland-mvp-e2e.log 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  [[ -n "${WORK_DIR:-}" ]] && rm -rf "$WORK_DIR"
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -fsS "$BASE_URL/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

TS="$(date +%s)"
CREATE_PAYLOAD="{\"title\":\"SciLand E2E ${TS}\",\"description\":\"Automated E2E challenge publication for MVP validation.\"}"
CREATE_RESP="$(curl -fsS -X POST "$BASE_URL/api/v1/challenges" \
  -H "Authorization: Bearer ${MODERATOR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD")"

CHALLENGE_ID="$(python3 - <<'PY' "$CREATE_RESP"
import json,sys
obj=json.loads(sys.argv[1])
print(obj.get('challenge_id',''))
PY
)"
REPO_URL="$(python3 - <<'PY' "$CREATE_RESP"
import json,sys
obj=json.loads(sys.argv[1])
print(obj.get('repo_url',''))
PY
)"

if [[ -z "$CHALLENGE_ID" ]]; then
  echo "failed to create challenge" >&2
  cat /tmp/sciland-mvp-e2e.log >&2 || true
  exit 1
fi

REPO_NAME="$CHALLENGE_ID"
export CHALLENGE_ID REPO_NAME

python3 - <<'PY'
import base64
import os
import requests

org = os.environ['GITHUB_ORG']
repo = os.environ['CHALLENGE_ID']
token = os.environ['GITHUB_TOKEN']
base = os.environ.get('GITHUB_API_BASE', 'https://api.github.com').rstrip('/')

workflow = """name: skill-ci
on:
  pull_request:
    branches:
      - version/v1
      - version/v2
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo \"skill ci ok\"
"""

headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': f'Bearer {token}',
    'X-GitHub-Api-Version': '2022-11-28',
}

content = base64.b64encode(workflow.encode()).decode()
for branch in ['main', 'version/v1', 'version/v2']:
    url = f"{base}/repos/{org}/{repo}/contents/.github/workflows/skill-ci.yml"
    r = requests.put(url, headers=headers, json={
        'message': f'chore(ci): add workflow on {branch}',
        'branch': branch,
        'content': content,
    }, timeout=30)
    if r.status_code not in (200,201):
        raise SystemExit(f"failed to add workflow on {branch}: {r.status_code} {r.text}")
PY

WORK_DIR="$(mktemp -d)"
cd "$WORK_DIR"

GH2_LOGIN="$(python3 - <<'PY'
import os
import requests
base = os.environ.get('GITHUB_API_BASE', 'https://api.github.com').rstrip('/')
headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': f"Bearer {os.environ['GITHUB_TOKEN2']}",
    'X-GitHub-Api-Version': '2022-11-28',
}
r = requests.get(f"{base}/user", headers=headers, timeout=30)
r.raise_for_status()
print(r.json()['login'])
PY
)"
export GH2_LOGIN

USER_BRANCH="submissions/v1/agent2-${TS}"
export USER_BRANCH

create_submission_files() {
  mkdir -p skills/agent2-demo
  cat > skills/agent2-demo/SKILL.md <<'SKILL'
---
name: agent2-demo
description: Demo skill submitted by simulated user for SciLand E2E validation.
---

# Agent2 Demo Skill

This skill is a demo artifact produced during automated end-to-end validation.
SKILL

  git add skills/agent2-demo/SKILL.md
  git -c user.name="agent2" -c user.email="agent2@example.com" commit -m "feat: submit agent2 demo skill" >/dev/null 2>&1
}

PR_HEAD=""

set +e
git clone "https://x-access-token:${GITHUB_TOKEN2}@github.com/${GITHUB_ORG}/${REPO_NAME}.git" repo >/dev/null 2>&1
CLONE_DIRECT_EXIT=$?
set -e

if [[ "$CLONE_DIRECT_EXIT" -eq 0 ]]; then
  cd repo
  git fetch origin "version/v1" >/dev/null 2>&1
  git checkout -b "$USER_BRANCH" "origin/version/v1" >/dev/null 2>&1
  create_submission_files

  set +e
  git push origin "$USER_BRANCH" >/dev/null 2>&1
  PUSH_DIRECT_EXIT=$?
  set -e

  if [[ "$PUSH_DIRECT_EXIT" -eq 0 ]]; then
    PR_HEAD="$USER_BRANCH"
  fi
fi

if [[ -z "$PR_HEAD" ]]; then
  cd "$WORK_DIR"
  rm -rf repo
  python3 - <<'PY'
import os
import requests

base = os.environ.get('GITHUB_API_BASE', 'https://api.github.com').rstrip('/')
headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': f"Bearer {os.environ['GITHUB_TOKEN2']}",
    'X-GitHub-Api-Version': '2022-11-28',
}
org = os.environ['GITHUB_ORG']
repo = os.environ['REPO_NAME']
r = requests.post(f"{base}/repos/{org}/{repo}/forks", headers=headers, timeout=30)
if r.status_code not in (202, 201):
    raise SystemExit(f"fork failed: {r.status_code} {r.text}")
PY

  python3 - <<'PY'
import os
import time
import requests
base = os.environ.get('GITHUB_API_BASE', 'https://api.github.com').rstrip('/')
headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': f"Bearer {os.environ['GITHUB_TOKEN2']}",
    'X-GitHub-Api-Version': '2022-11-28',
}
owner = os.environ['GH2_LOGIN']
repo = os.environ['REPO_NAME']
ok = False
for _ in range(30):
    r = requests.get(f"{base}/repos/{owner}/{repo}", headers=headers, timeout=30)
    if r.status_code == 200:
        ok = True
        break
    time.sleep(2)
if not ok:
    raise SystemExit("fork repo not ready")
PY

  git clone "https://x-access-token:${GITHUB_TOKEN2}@github.com/${GH2_LOGIN}/${REPO_NAME}.git" repo >/dev/null 2>&1
  cd repo
  git remote add upstream "https://github.com/${GITHUB_ORG}/${REPO_NAME}.git"
  git fetch upstream "version/v1" >/dev/null 2>&1
  git checkout -b "$USER_BRANCH" "upstream/version/v1" >/dev/null 2>&1
  create_submission_files
  git push origin "$USER_BRANCH" >/dev/null 2>&1
  PR_HEAD="${GH2_LOGIN}:${USER_BRANCH}"
fi

export PR_HEAD

PR_RESP="$(python3 - <<'PY'
import json
import os
import requests

base = os.environ.get('GITHUB_API_BASE', 'https://api.github.com').rstrip('/')
org = os.environ['GITHUB_ORG']
repo = os.environ['REPO_NAME']
token = os.environ['GITHUB_TOKEN2']
pr_head = os.environ['PR_HEAD']
headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': f'Bearer {token}',
    'X-GitHub-Api-Version': '2022-11-28',
}
r = requests.post(
    f"{base}/repos/{org}/{repo}/pulls",
    headers=headers,
    json={
        'title': 'submission(v1): agent2 demo',
        'body': 'Automated submission from simulated user token.',
        'head': pr_head,
        'base': 'version/v1',
    },
    timeout=30,
)
if r.status_code != 201:
    raise SystemExit(f"create pr failed: {r.status_code} {r.text}")
print(json.dumps(r.json()))
PY
)"

PR_NUMBER="$(python3 - <<'PY' "$PR_RESP"
import json,sys
obj=json.loads(sys.argv[1])
print(obj.get('number',''))
PY
)"
PR_URL="$(python3 - <<'PY' "$PR_RESP"
import json,sys
obj=json.loads(sys.argv[1])
print(obj.get('html_url',''))
PY
)"
HEAD_SHA="$(python3 - <<'PY' "$PR_RESP"
import json,sys
obj=json.loads(sys.argv[1])
print(obj.get('head',{}).get('sha',''))
PY
)"

if [[ -z "$PR_NUMBER" || -z "$HEAD_SHA" ]]; then
  echo "pr create parse failed" >&2
  exit 1
fi
export PR_NUMBER PR_URL HEAD_SHA

# wait for CI checks to complete/success
python3 - <<'PY'
import os
import time
import requests

base = os.environ.get('GITHUB_API_BASE', 'https://api.github.com').rstrip('/')
org = os.environ['GITHUB_ORG']
repo = os.environ['REPO_NAME']
sha = os.environ['HEAD_SHA']
token = os.environ['GITHUB_TOKEN']

headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': f'Bearer {token}',
    'X-GitHub-Api-Version': '2022-11-28',
}

ok = False
for _ in range(60):
    r = requests.get(f"{base}/repos/{org}/{repo}/commits/{sha}/check-runs", headers=headers, timeout=30)
    if r.status_code != 200:
        time.sleep(3)
        continue
    runs = r.json().get('check_runs', [])
    if not runs:
        time.sleep(3)
        continue
    if all(x.get('status') == 'completed' for x in runs):
        if all(x.get('conclusion') == 'success' for x in runs):
            ok = True
            break
        raise SystemExit('checks completed but not success')
    time.sleep(3)

if not ok:
    raise SystemExit('checks did not reach success in time')
PY

# trigger webhook
WEBHOOK_BODY="$(python3 - <<'PY'
import json
import os

print(json.dumps({
  'action': 'completed',
  'repository': {
    'name': os.environ['REPO_NAME'],
    'owner': {'login': os.environ['GITHUB_ORG']}
  },
  'check_suite': {
    'pull_requests': [{'number': int(os.environ['PR_NUMBER'])}]
  }
}))
PY
)"

SIG_HEADER=""
if [[ -n "${GITHUB_WEBHOOK_SECRET:-}" ]]; then
  SIG="$(python3 - <<'PY'
import hashlib
import hmac
import os

body = os.environ['WEBHOOK_BODY'].encode('utf-8')
secret = os.environ['GITHUB_WEBHOOK_SECRET'].encode('utf-8')
print('sha256=' + hmac.new(secret, body, hashlib.sha256).hexdigest())
PY
)"
  SIG_HEADER="-H x-hub-signature-256:${SIG}"
fi

# shellcheck disable=SC2086
curl -fsS -X POST "$BASE_URL/api/v1/webhooks/github" \
  -H "Content-Type: application/json" \
  -H "x-github-event: check_suite" \
  ${SIG_HEADER} \
  -d "$WEBHOOK_BODY" >/dev/null

MERGED="$(python3 - <<'PY'
import os
import time
import requests

base = os.environ.get('GITHUB_API_BASE', 'https://api.github.com').rstrip('/')
org = os.environ['GITHUB_ORG']
repo = os.environ['REPO_NAME']
pr = os.environ['PR_NUMBER']
token = os.environ['GITHUB_TOKEN']
headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': f'Bearer {token}',
    'X-GitHub-Api-Version': '2022-11-28',
}
merged = False
for _ in range(20):
    r = requests.get(f"{base}/repos/{org}/{repo}/pulls/{pr}", headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()
        if data.get('merged_at'):
            merged = True
            break
    time.sleep(2)
print('true' if merged else 'false')
PY
)"

cd "$ROOT_DIR"
echo "E2E_SUMMARY challenge_id=${CHALLENGE_ID} repo=${REPO_URL} pr=${PR_URL} merged=${MERGED}"
