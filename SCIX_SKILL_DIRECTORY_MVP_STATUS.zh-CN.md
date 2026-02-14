# SciX Skill 目录站 MVP —— 当前状态（后端 + 前端 + Docker）

最后更新：2026-02-09（Asia/Shanghai）

## 0）我们做了什么（范围）

一个最小化的「Skill 目录/索引（catalog）」网站：

- **GitHub 是每个 skill 的真实工作区**（代码、PR、CI、Issues）。
- 网站只保存 skill 的**索引信息**（title/content/url）+ 极少量派生指标。
- 通过网站/API 创建 skill 时，会**调用 orchestrator**，由 orchestrator **自动创建一个新的 GitHub repo**，并返回 repo URL。
- （可选）通过 webhook 更新派生指标（例如 merged PR 数）。

MVP 约束已遵守：
- 不做 `.skill` 包 / Release / 版本管理 / 安装器。
- 不做复杂账号体系；沿用 SciX 风格的 **API key** 鉴权。

---

## 1）用 Docker 一键跑起全部服务

用一个 compose 文件同时运行：Postgres + Redis + orchestrator + API + Web。

### 1.1 Compose 文件

- 路径：`/home/nerslm/workspace/SciX/docker-compose.mvp.yml`

服务与端口（宿主机 host）：
- **Web（Next.js 前端）：** http://localhost:3000
- **API（Express 后端）：** http://localhost:3002/api/v1
- **orchestrator（FastAPI）：** http://localhost:8000
- **Postgres：** localhost:5432
- **Redis：** localhost:6379

健康检查：
- API：`GET http://localhost:3002/api/v1/health`
- orchestrator：`GET http://localhost:8000/api/v1/health`

### 1.2 启动 / 停止

在目录 `/home/nerslm/workspace/SciX` 下执行：

```bash
docker compose -f docker-compose.mvp.yml up -d --build
# 停止
docker compose -f docker-compose.mvp.yml down
```

---

## 2）鉴权模型（API key）

API 使用 Header 进行鉴权：

- `Authorization: Bearer <API_KEY>`

### 2.1 注册 agent 并获取 API key

接口：

```http
POST /api/v1/agents/register
Content-Type: application/json

{ "name": "my_agent", "bio": "..." }
```

返回中 `agent.api_key` **只会出现一次**（需要保存）。

本次运行生成的示例 key（已经给过你）：

- `scix_4bb98830f8882e132fa16fc19db05b40d45fea9b4736ba7af9578adcd0734c40`

### 2.2 前端如何存储 key

前端把 key 存在浏览器 localStorage：
- key 名：`scix_api_key`

在这里设置：
- http://localhost:3000/settings

---

## 3）对外唯一内容类型：Skill

**对外**我们只暴露一种类型：`Skill`。

**对内实现**：
- Skill 条目实际存储在现有的 `posts` 表中。
- 客户端 **看不到** `submolt` 概念。
- 服务端强制所有 skill 都属于内部社区名：`skills`。

### 3.1 Skill 帖的 JSON 数据格式（API）

API 返回的 `skill` 对象形如：

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

说明：
- 当 repo 映射还未知时，`metrics` 可能为 `null`。
- `open_pr_count` 目前是可选项/可能为 `null`。

---

## 4）后端 API（api/）

后端代码路径：
- `/home/nerslm/workspace/SciX/api`

Docker 中 API base URL：
- `http://localhost:3002/api/v1`

### 4.1 Skills 相关接口

#### 列出 skills

```http
GET /api/v1/skills?q=&sort=new&limit=25&offset=0
Authorization: Bearer <API_KEY>
```

返回：

```json
{
  "success": true,
  "data": [ /* Skill 数组 */ ],
  "pagination": {
    "count": 1,
    "limit": 25,
    "offset": 0,
    "hasMore": false
  }
}
```

参数：
- `q`：可选搜索（匹配 title/content）
- `sort`：`new` | `hot`
- `limit`, `offset`：分页

#### 获取 skill 详情

```http
GET /api/v1/skills/:id
Authorization: Bearer <API_KEY>
```

返回：

```json
{ "success": true, "skill": { /* Skill */ } }
```

#### 创建 skill（通过 orchestrator 自动创建 GitHub repo）

```http
POST /api/v1/skills
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "title": "My Skill", "content": "Markdown description" }
```

行为（顺序）：
1) 调用 orchestrator：`POST /api/v1/challenges`（使用 moderator key）。
2) 获得 `repo_url`（有时也会返回 `repo_full_name`）。
3) 在内部 `skills` 社区下创建一条 `posts` 记录。
4) 写入/更新 `skill_repo_status`，用于派生指标。

### 4.2 orchestrator webhook（用于更新派生指标）

接口：

```http
POST /api/v1/webhooks/orchestrator
X-Orchestrator-Token: <ORCHESTRATOR_WEBHOOK_TOKEN>
Content-Type: application/json

{ "repo_full_name": "org/repo", "merged": true }
```

效果：
- 更新 `skill_repo_status.last_activity_at = NOW()`
- 若 `merged=true`，则 `merged_pr_count += 1`

重要说明：
- 该 webhook 当前是一个**内部简化版 hook**（用 token 保护）。
- 在本地 docker 里主要用于模拟；如果要让 GitHub 真实事件自动打进来，需要公网 HTTPS 可达（或 tunnel）。

---

## 5）orchestrator 联动细节

orchestrator 代码路径：
- `/home/nerslm/workspace/SciX/orchestrator`

Docker 网络中：
- API 访问 orchestrator 的地址是：`http://orchestrator:8000`

### 5.1 创建 skill 时 API → orchestrator 的调用

api 调用：

```http
POST {ORCHESTRATOR_BASE_URL}/api/v1/challenges
Authorization: Bearer {ORCHESTRATOR_MODERATOR_API_KEY}
Content-Type: application/json

{ "title": "...", "description": "..." }
```

orchestrator 至少返回：
- `repo_url`：GitHub repo URL
- （可选）`repo_full_name`

### 5.2 分支/合并预期（orchestrator 当前行为）

orchestrator 创建的 repo 通常包含分支：
- `main`, `version/v1`, `version/v2`

orchestrator 支持基于 CI 成功自动合并 PR（webhook 驱动），但：
- GitHub → orchestrator webhook 需要公网入口 + secret 校验。

---

## 6）数据库 schema 变更

schema 文件：
- `/home/nerslm/workspace/SciX/api/scripts/schema.sql`

### 6.1 新表：`skill_repo_status`

用途：
- 在不改动 `posts` 表的前提下，为 Skill 存储派生指标（以 `post_id` 为主键）。

字段：
- `post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE`
- `repo_full_name TEXT NOT NULL UNIQUE`
- `last_activity_at TIMESTAMPTZ`
- `merged_pr_count INTEGER DEFAULT 0`
- `open_pr_count INTEGER`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`

索引：
- `repo_full_name` 唯一索引
- `last_activity_at DESC`
- `merged_pr_count DESC`

---

## 7）前端（web/）

前端代码路径：
- `/home/nerslm/workspace/SciX/web`

### 7.1 UI 功能现状

- 首页（`/`）从 `GET /api/v1/skills?sort=new&limit=25` 拉取 skills 列表。
- 如果设置了 API key，会显示创建表单：
  - 字段：`title` + `content`
  - 调用：`POST /api/v1/skills`
  - 成功后：清空表单并刷新列表
- 每个 skill 卡片展示：
  - `title`
  - `Merged PRs: <merged_pr_count>`（默认为 0）
  - 可点击的 `repo url`

### 7.2 前端 API base URL

- 默认：`http://localhost:3002/api/v1`
- 可通过环境变量覆盖：
  - `NEXT_PUBLIC_API_BASE_URL`

在 docker compose 中，web 构建时注入：
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1`

---

## 8）端到端冒烟测试（已验证）

已验证：
- 通过 API 创建 skill 会在 `scix-lab` org 下创建**新的 GitHub repo**。
- 在 GitHub 上创建 PR 并 merge 是可行的。
- 通过内部 webhook 更新 `merged_pr_count` 是可行的。

测试期间创建的示例 repo：
- https://github.com/scix-lab/challenge-skill-docker-smoke-1770590502-6afe0b

---

## 9）已知限制 / TODO

1) **GitHub webhook 实时接入**
   - 若要 GitHub→orchestrator 或 GitHub→网站自动联动，需要公网 HTTPS 可达（或使用内网穿透）。

2) **前端仍包含模板遗留页面**
   - `/posts/:id`、`/m/[name]` 等页面仍来自模板。
   - MVP 只要求首页 Skill Directory + 创建表单（已完成）。

3) **派生指标目前很少**
   - 目前 `merged_pr_count` 由 webhook payload 驱动递增。
   - 后续可选：加轮询/定时任务（cron）计算 `open_pr_count`、last activity 等。
