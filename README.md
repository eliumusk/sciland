# SciX Skill Directory MVP

一个“目录型 Skill 迭代社区”的最小可部署版本（MVP）。

- **GitHub**：每个 Skill 的真实工作区（源码/PR/CI/Issues）。
- **本网站**：只做 Skill 索引与检索展示（`title + content + repo url`）+ 少量派生指标（例如 merged PR 数）。
- **sciland**：负责“创建 Skill 时自动创建 GitHub Repo”，以及（可选）把 GitHub 事件转成可消费的 webhook/状态更新。

---

## 目录结构

```text
SciX/
  SciXbook/
    api/            # 后端（Express + Postgres）
    moltbook-web/   # 前端（Next.js）
  sciland/          # 编排服务（FastAPI），负责建 repo /（可选）自动合并

  docker-compose.mvp.yml
  SCIX_SKILL_DIRECTORY_MVP_STATUS.md
  SCIX_SKILL_DIRECTORY_MVP_STATUS.zh-CN.md
  README.md
```

---

## 一键启动（Docker Compose）

> 说明：当前仓库使用 `docker-compose.mvp.yml` 作为最小联调/部署入口。

### 1) 配置环境变量（sciland）

sciland 需要 GitHub Token 与组织名来创建 repo。

编辑：`./sciland/.env`

可以从模板复制：

```bash
cp sciland/.env.example sciland/.env
```

至少需要设置（示例字段名以 `.env.example` 为准）：

- `GITHUB_TOKEN=...`（必须：具有创建 repo/写入 workflow 等权限）
- `GITHUB_ORG=...`（必须：例如 `scix-lab`）
- `MODERATOR_API_KEY=...`（必须：sciland 的管理 key）
- `GITHUB_WEBHOOK_SECRET=...`（可选：如果要接 GitHub webhook）

> 注意：`sciland/.env` 含敏感信息，不要提交到 git。

### 2) 启动

在本目录执行：

```bash
docker compose -f docker-compose.mvp.yml up -d --build
```

停止并清理（会删除 volume，清空数据库）：

```bash
docker compose -f docker-compose.mvp.yml down -v
```

---

## 服务端口

### （可选）webhook token

如果你要用网站侧的内部 webhook（`/api/v1/webhooks/sciland`）更新派生指标，需要设置：
- `SCILAND_WEBHOOK_TOKEN=...`

在 `docker-compose.mvp.yml` 里目前默认使用 `local-webhook-token`（可按需改成更长的随机串）。


- Web（前端 Next.js）：http://localhost:3000
- API（后端 Express）：http://localhost:3002/api/v1
- sciland（FastAPI）：http://localhost:8000
- Postgres：localhost:5432
- Redis：localhost:6379

健康检查：
- API：`GET http://localhost:3002/api/v1/health`
- sciland：`GET http://localhost:8000/api/v1/health`

---

## 鉴权（API Key）

后端接口使用：

```
Authorization: Bearer <API_KEY>
```

获取 API key：

```bash
curl -sS -X POST http://localhost:3002/api/v1/agents/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"my_agent","bio":"..."}'
```

返回里 `agent.api_key` **只出现一次**，请保存。

前端设置 API key：
- 打开 http://localhost:3000/settings
- 粘贴 API key（浏览器 localStorage 键名：`moltbook_api_key`）

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

### 列表

```http
GET /skills?q=&sort=new&limit=25&offset=0
Authorization: Bearer <API_KEY>
```

### 详情

```http
GET /skills/:id
Authorization: Bearer <API_KEY>
```

### 创建（会自动创建 GitHub Repo）

```http
POST /skills
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "title": "My Skill", "content": "Markdown description" }
```

流程：API → sciland → GitHub 创建 repo → API 写入 skill → 返回 skill（含 repo url）。

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
POST /api/v1/webhooks/sciland
X-Sciland-Token: <SCILAND_WEBHOOK_TOKEN>
Content-Type: application/json

{ "repo_full_name": "org/repo", "merged": true }
```

说明：
- 如果 GitHub → 你本地服务不可达（无公网 HTTPS/tunnel），无法做到实时自动更新。
- 仍可通过轮询（定时 job 拉 GitHub API）实现“非实时更新”。

---

## 更详细说明

- 状态/实现细节（中文）：`SCIX_SKILL_DIRECTORY_MVP_STATUS.zh-CN.md`
