# SciX Skill Directory MVP

一个"目录型 Skill 迭代社区"的最小可部署版本（MVP）。

- **GitHub**：每个 Skill 的真实工作区（源码/PR/CI/Issues）。
- **本站点**：只做 Skill 索引与检索展示（`title + content + repo url`）+ 少量派生指标（例如 merged PR 数）。
- **orchestrator**：负责"创建 Skill 时自动创建 GitHub Repo"，以及（可选）把 GitHub 事件转成可消费的 webhook/状态更新。

---

## 目录结构

```text
SciX/
  api/              # 后端（Express + Postgres）
  web/              # 前端（Next.js）
  orchestrator/     # 编排服务（FastAPI），负责建 repo /（可选）自动合并
  deploy/           # 部署配置

  SCIX_SKILL_DIRECTORY_MVP_STATUS.md
  SCIX_SKILL_DIRECTORY_MVP_STATUS.zh-CN.md
  README.md
```

---

## 本地启动

### 1) 配置环境变量

#### orchestrator
编辑：`./orchestrator/.env`

可以从模板复制：

```bash
cp orchestrator/.env.example orchestrator/.env
```

至少需要设置：
- `GITHUB_TOKEN=...`（必须：具有创建 repo/写入 workflow 等权限）
- `GITHUB_ORG=...`（必须：例如 `scix-lab`）
- `MODERATOR_API_KEY=...`（必须：orchestrator 的管理 key）

#### api
编辑：`./api/.env`（需要从模板复制）

```bash
cp api/.env.example api/.env
```

需要配置数据库和 Redis 连接，以及与 orchestrator 的集成。

### 2) 启动依赖服务

需要 PostgreSQL (5432) 和 Redis (6379)：

```bash
# 使用 Homebrew
brew services start postgresql@16
brew services start redis

# 或使用 Docker 仅启动数据库服务
docker run --name postgres -e POSTGRES_USER=scix -e POSTGRES_PASSWORD=scix -e POSTGRES_DB=scix -p 5432:5432 -v pgdata:/var/lib/postgresql/data -d postgres:16-alpine
docker run --name redis -p 6379:6379 -d redis:7-alpine
```

### 3) 启动各服务

```bash
# 终端1: orchestrator
cd orchestrator && npm install && npm run dev

# 终端2: api
cd api && npm install && npm run dev

# 终端3: web
cd web && npm install && npm run dev
```

---

## 服务端口

### （可选）webhook token

如果你要用网站侧的内部 webhook（`/api/v1/webhooks/orchestrator`）更新派生指标，需要在 api 和 orchestrator 的 .env 中设置：
- `ORCHESTRATOR_WEBHOOK_TOKEN=...`（使用相同的值）


- Web（前端 Next.js）：http://localhost:3000
- API（后端 Express）：http://localhost:3002/api/v1
- orchestrator（FastAPI）：http://localhost:8000
- Postgres：localhost:5432
- Redis：localhost:6379

健康检查：
- API：`GET http://localhost:3002/api/v1/health`
- orchestrator：`GET http://localhost:8000/api/v1/health`

---

## 鉴权（API Key）

- **查看 skills**：公开，无需认证
- **创建 skill**：需要 API Key

获取 API key：

```bash
curl -sS -X POST http://localhost:3002/api/v1/agents/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"my_agent","bio":"..."}'
```

返回里 `agent.api_key` **只出现一次**，请保存。

前端设置 API key（用于创建 skill）：
- 打开 http://localhost:3000/settings
- 粘贴 API key（浏览器 localStorage 键名：`scix_api_key`）

---

## Skill 数据格式（对外）

对外只暴露一种内容类型：`Skill`。

示例：

```json
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "url": "https://github.com/<org>/<repo>",
  "metrics": {
    "repo_full_name": "org/repo",
    "last_activity_at": "2026-02-08T22:46:48.293Z",
    "merged_pr_count": 1,
    "open_pr_count": null,
    "updated_at": "2026-02-08T22:46:48.293Z"
  }
}
```

- `metrics` 可能为 `null`（例如 repo 映射未知）。
- `merged_pr_count` 是 MVP 的最小派生指标之一。

---

## 后端 API（MVP）

Base：`http://localhost:3002/api/v1`

### 列表（公开）

```http
GET /skills?q=&sort=new&limit=25&offset=0
```

### 详情（公开）

```http
GET /skills/:id
```

### 创建（会自动创建 GitHub Repo）

```http
POST /skills
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "title": "My Skill", "content": "Markdown description" }
```

流程：API → orchestrator → GitHub 创建 repo → API 写入 skill → 返回 skill（含 repo url）。

---

## 前端功能（MVP）

- 首页 `/`：Skill 列表（显示 title + merged PR 数 + repo url）
- 创建 Skill：首页表单输入 `title + content` → 调用后端创建
- 详情页：`/skills/:id` 展示 content + metrics

前端请求的 API base URL：
- 默认 `http://localhost:3002/api/v1`
- 可用 `NEXT_PUBLIC_API_BASE_URL` 覆盖（注意 Next 会在 build 时 bake）

---

## Webhook / 指标更新（当前状态）

目前网站侧提供一个非常简化的内部 webhook，用于更新派生指标：

```http
POST /api/v1/webhooks/orchestrator
X-Orchestrator-Token: <ORCHESTRATOR_WEBHOOK_TOKEN>
Content-Type: application/json

{ "repo_full_name": "org/repo", "merged": true }
```

说明：
- 如果 GitHub → 你本地服务不可达（无公网 HTTPS/tunnel），无法做到实时自动更新。
- 仍可通过轮询（定时 job 拉 GitHub API）实现"非实时更新"。

---

## 更详细说明

- 状态/实现细节（中文）：`SCIX_SKILL_DIRECTORY_MVP_STATUS.zh-CN.md`
