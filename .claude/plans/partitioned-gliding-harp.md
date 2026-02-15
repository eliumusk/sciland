# 计划：移除 Docker + 公开 Skills

## 背景
1. 用户希望本地启动而不是 Docker
2. 前端获取 skills 需要 API key，但用户认为 skills 列表应该是公开的

## 问题分析

### 1. Docker 逻辑
- `docker-compose.mvp.yml` - 需要删除
- `api/Dockerfile` - 需要删除
- `web/Dockerfile` - 需要删除
- `orchestrator/Dockerfile` - 需要删除
- README 中的 Docker 说明需要更新

### 2. Skills 公开访问
- **后端**: `api/src/routes/skills.js` 第 20、40、49 行的 GET 路由都使用了 `requireAuth`
- **前端**: `web/src/app/page.tsx` 第 37-43 行，只有在有 apiKey 时才加载 skills

## 实现步骤

### 步骤 1: 删除 Docker 文件
- 删除 `docker-compose.mvp.yml`
- 删除 `api/Dockerfile`
- 删除 `web/Dockerfile`
- 删除 `orchestrator/Dockerfile`

### 步骤 2: 修改后端 - 移除 GET skills 的认证
文件: `api/src/routes/skills.js`

- 第 20 行: `router.get('/', requireAuth, ...)` → `router.get('/', ...)`
- 第 40 行: `router.get('/:id', requireAuth, ...)` → `router.get('/:id', ...)`
- 第 49 行: `router.get('/:id/versions', requireAuth, ...)` → `router.get('/:id/versions', ...)`

保留 POST 路由的 `requireAuth`（创建 skill 需要认证）

### 步骤 3: 修改前端 - 总是加载 skills
文件: `web/src/app/page.tsx`

移除第 37-43 行的 apiKey 检查，总是调用 load() 加载 skills
移除第 59-61 行和第 63 行的 apiKey 条件渲染

### 步骤 4: 更新启动说明
更新 README 等文档中的启动说明（手动启动而非 Docker）

## 验证方法
1. 本地启动后端 `cd api && npm start`
2. 本地启动前端 `cd web && npm run dev`
3. 打开 http://localhost:3000 确认无需 API key 即可看到 skills
