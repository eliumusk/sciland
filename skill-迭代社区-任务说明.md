:# Skill 迭代社区（MVP）任务说明（当前决策版）

> 目标（最重要的一句话）：
>
> **你的网站做“Skill 目录/帖子 + 检索/评价”，GitHub 做“每个 Skill 仓库的迭代”。**
>
> 当前 MVP 只要把"写作与索引体验"做出来；`orchestrator` 是可选的自动化编排底座，用于后续把"发帖→自动建 repo→PR→CI→合并"串起来。

---

## 0. MVP 边界（你明确要求）

### 0.1 MVP 做什么
- 网站维护 **Skill 条目（索引）**：像发帖一样创建/编辑/下架
- 提供 **搜索/过滤/排序**（先简单）
- 展示 **Skill 描述 + GitHub 仓库网址**
- 提供 **反馈入口**（最简即可：评论/投票/跳 GitHub Issues 三选一）

### 0.2 MVP 明确不做什么
- 不做 `.skill` 包
- 不做 GitHub Release/版本管理
- 不做下载分发与安装器
- 不做复杂账号体系（可先管理员 API key）

---

## 1. 产品形态：你现在在做什么？

你做的是一个 **Skill Directory / Catalog（目录型社区）**：
- 价值在“发现（discover）+ 信任（reputation）+ 组织（taxonomy）”，而不是包管理。

GitHub 在这个体系里的角色：
- **Skill 的真实工作区**（源码、PR、issue、迭代节奏全部在 GitHub）
- 你的网站只需要记录：它是什么、适合谁、怎么用、在哪里。

---

## 2. orchestrator 项目现在"完整了什么"（你可以把它当作什么组件）

`SciX/orchestrator` 更像一个 **GitHub 编排服务（orchestrator）**，已经做了这些底座能力：

### 2.1 Python / FastAPI（README 主线）
- 创建 challenge repo（在 GitHub Org 下）：写入 `CHALLENGE.md`
- 初始化分支（`main` + `version/v1,v2` 可配置）并设置分支保护
- 提供 challenge 列表/详情/提交（PR）查询接口
- 接 GitHub webhook：当 PR + CI checks 全绿时自动 merge（规则已实现）
- MVP 鉴权：moderator API key + requester token

### 2.2 Node / Express（补充能力）
- 也能创建 challenge；更偏“平台代提交内容/轻量提交 API”

### 2.3 结论（在你当前 MVP 里怎么用）
- **你现在的目录型 MVP，不依赖 orchestrator 也能上线**（手动填 GitHub URL）。
- orchestrator 适合成为"后续增强功能"：当你要把"发帖→自动创建 GitHub repo"自动化时，再接入。

---

## 3. 网站（社区）侧：最小数据模型（MVP）

### 3.1 skills 表（核心）
最小字段建议：
- `id`
- `name`（唯一，展示名）
- `summary`（一句话）
- `description_md`（Markdown 长描述）
- `github_url`（必填）
- `tags`（数组或逗号字符串）
- `status`：`active|hidden|removed`
- `created_at` / `updated_at`

可选（先留字段，先不做功能也行）：
- `issues_url`（默认 = github_url + `/issues`）
- `risk_flags`（手动标注：是否含脚本/是否联网等）

### 3.2 feedback（任选一个最小闭环）
- 选项 A：站内评论（最产品化）
- 选项 B：站内投票（up/down）
- 选项 C：仅跳转 GitHub Issues（最快）

---

## 4. 网站后端 API（最小集合）

### 4.1 Skill 条目
- `POST /api/skills` 创建
- `PATCH /api/skills/:id` 编辑
- `GET /api/skills?q=&tag=&sort=` 列表/搜索
- `GET /api/skills/:id` 详情
- `PATCH /api/skills/:id` 设置 `status=hidden/removed`

### 4.2 反馈（可选）
- `POST /api/skills/:id/vote`
- `POST /api/skills/:id/comments`
- `GET /api/skills/:id/comments`

> 鉴权：MVP 建议只做一个 **管理员 API key** 保护创建/编辑/下架；浏览/搜索公开。

---

## 5. 网站与 orchestrator 联动：推荐分三阶段走（不把 MVP 搞复杂）

### 阶段 0（现在的 MVP）：完全不联动 orchestrator
- 你的网站只做目录：录入/编辑 `github_url` 即可。

### 阶段 1（增强：一键建仓库）：把 orchestrator 当"创建 GitHub repo 的后端能力"
当你希望用户"发帖创建 skill 时自动得到一个 repo"，再做：
- 网站新增按钮：**"创建 Skill 并生成 GitHub 仓库"**
- 网站后端调用 orchestrator：`POST /api/v1/challenges`（moderator key）
- orchestrator 返回 `repo_url`（以及 repo_name 作为 challenge_id）
- 网站写入：
  - `github_url = repo_url`
  - 可选：`orchestrator_challenge_id = repo_name`（用于后续查询状态）

> 注意：这个阶段仍然不做版本/Release/打包。只是减少“手动建 repo”的摩擦。

### 阶段 2（增强：展示进度）：在 Skill 详情页显示 PR/CI/合并状态（可选）
- 方案 A（最省事）：详情页按需调用 orchestrator：
  - `GET /api/v1/challenges/{challenge_id}`
  - `GET /api/v1/challenges/{challenge_id}/submissions`
- 方案 B（更产品化）：网站自己落库状态（需要你接 webhook 或让 orchestrator 回调你的网站）

---

## 6. 下一步任务清单（最短路径，按顺序）

1. 实现 `skills` 的 CRUD + 列表搜索（后端）
2. 做 3 个页面：列表 / 详情 / 管理（前端）
3. 加 tags 规范（先手工）与最简单排序（recent / popular）
4. 做一个反馈入口（C 跳 GitHub Issues 最快）
5. 录入 20 个种子 skill（让目录看起来“像社区”）

### 6.x 贡献与“记录在案”（PR + CI 的最小闭环）
- **贡献方式**：参与者在 GitHub 上对 skill 仓库提交改动（fork 或直接分支）并发起 **Pull Request**。
- **CI（GitHub Actions workflow）**：当 PR 指向约定分支（例如 `version/v1` / `version/v2`）时自动运行检查（测试/校验）。
- **记录在案**：每一次贡献都会在 GitHub 留下：commit、PR 讨论、以及 CI checks 结果（成功/失败与日志）。
- **MVP 决策**：社区网站不直接处理代码合并，只需提供 GitHub 链接与贡献入口；是否合并由仓库维护者（或 orchestrator webhook 自动合并）决定。

（可选增强）
6. 接入 orchestrator 阶段 1：一键建 GitHub repo
7. 再考虑阶段 2：详情页显示 PR/CI 状态

---

## 7. 未来（非 MVP）再考虑的方向（先不做）
- 自动同步 GitHub README/topics 到社区（减少手填）
- 风险扫描与更细的权限标注
- 用户体系/付费/私有可见性
- 版本管理、包分发、一键安装
- 推荐系统与质量评分模型
