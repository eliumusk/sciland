#!/bin/bash
# SciX 一键部署脚本

set -e

echo "=== SciX 一键部署 ==="

# 配置
export PORT_WEB=3000
export PORT_API=3002
export PORT_ORCHESTRATOR=8000
export GITHUB_ORG="${GITHUB_ORG:-SciX-Skill}"
export WEBHOOK_SECRET="${WEBHOOK_SECRET:-$(openssl rand -hex 20)}"
export MODERATOR_API_KEY="${MODERATOR_API_KEY:-$(openssl rand -hex 32)}"
export JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

echo "步骤 1: 安装系统依赖"
apt update -qq
apt install -y -qq postgresql postgresql-contrib python3 python3-pip >/dev/null 2>&1

echo "步骤 2: 启动 PostgreSQL"
systemctl start postgresql
systemctl enable postgresql

echo "步骤 3: 创建数据库"
sudo -u postgres createdb scix 2>/dev/null || true

echo "步骤 4: 安装 Node.js 依赖"
cd /opt/sciland/api && npm install --silent 2>/dev/null || npm install
cd /opt/sciland/web && npm install --silent 2>/dev/null || npm install

echo "步骤 5: 安装 Python 依赖"
cd /opt/sciland/orchestrator && pip install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt

echo "步骤 6: 配置环境变量"

# API
cd /opt/sciland/api
cat > .env << EOF
PORT=$PORT_API
DATABASE_URL=postgres://postgres:postgres@localhost:5432/scix
JWT_SECRET=$JWT_SECRET
ORCHESTRATOR_BASE_URL=http://localhost:$PORT_ORCHESTRATOR
ORCHESTRATOR_MODERATOR_API_KEY=$MODERATOR_API_KEY
EOF

# 初始化数据库表
sudo -u postgres psql -d scix -f /opt/sciland/api/scripts/schema.sql 2>/dev/null || true

# Orchestrator
cd /opt/sciland/orchestrator
cat > .env << EOF
PORT=$PORT_ORCHESTRATOR
APP_ENV=production
GITHUB_TOKEN=$GITHUB_TOKEN
GITHUB_ORG=$GITHUB_ORG
GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET
MODERATOR_API_KEY=$MODERATOR_API_KEY
CHALLENGE_REPO_PREFIX=skill
VERSION_BRANCHES=version/v1,version/v2,version/v3
EOF

echo "步骤 7: 清理并启动服务"

# 安装 pm2
npm install -g pm2 2>/dev/null || true

# 清理旧进程
pm2 delete all 2>/dev/null || true

# 杀掉占用端口的进程
lsof -ti:$PORT_API | xargs kill -9 2>/dev/null || true
lsof -ti:$PORT_WEB | xargs kill -9 2>/dev/null || true
lsof -ti:$PORT_ORCHESTRATOR | xargs kill -9 2>/dev/null || true

# 启动服务
cd /opt/sciland/orchestrator
pm2 start "python3 -m uvicorn app.main:app --host 0.0.0.0 --port $PORT_ORCHESTRATOR" --name orchestrator

cd /opt/sciland/api
pm2 start src/index.js --name api

cd /opt/sciland/web
pm2 start npm --name web -- start

pm2 save

echo ""
echo "=== 部署完成 ==="
echo ""
echo "服务状态:"
pm2 status
echo ""
echo "下一步: 启动 Cloudflare Tunnel"
echo "  cloudflared tunnel --url http://localhost:$PORT_WEB"
