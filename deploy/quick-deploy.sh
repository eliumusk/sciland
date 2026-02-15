#!/bin/bash
# SciX 一键部署脚本
# IP: 39.98.61.112:50001

set -e

echo "=== SciX 一键部署 ==="

# 配置
export HOST="0.0.0.0"
export PORT_WEB=3000
export PORT_API=3002
export PORT_ORCHESTRATOR=8000
export EXTERNAL_IP="39.98.61.112"
export EXTERNAL_PORT=50001

# GitHub Token (必须设置)
if [ -z "$GITHUB_TOKEN" ]; then
    echo "请设置 GITHUB_TOKEN 环境变量:"
    echo "  export GITHUB_TOKEN=ghp_xxxx"
    exit 1
fi

# 组织名称
export GITHUB_ORG="${GITHUB_ORG:-SciX-Skill}"

# Webhook Secret
export WEBHOOK_SECRET="${WEBHOOK_SECRET:-$(openssl rand -hex 20)}"

# Moderator API Key
export MODERATOR_API_KEY="${MODERATOR_API_KEY:-$(openssl rand -hex 32)}"

echo "配置:"
echo "  GITHUB_ORG: $GITHUB_ORG"
echo "  EXTERNAL: $EXTERNAL_IP:$EXTERNAL_PORT"
echo "  WEBHOOK_SECRET: (已设置)"
echo "  MODERATOR_API_KEY: (已设置)"

# 1. 安装依赖
echo ""
echo "=== 安装依赖 ==="

# Python
cd orchestrator
pip install -r requirements.txt -q

# Node.js
cd ../api
npm install --silent 2>/dev/null || npm install

cd ../web
npm install --silent 2>/dev/null || npm install

# 2. 配置环境变量
echo ""
echo "=== 配置环境变量 ==="

# API
cd ../api
cat > .env << EOF
PORT=$PORT_API
NODE_ENV=production
DATABASE_URL=postgres://postgres:postgres@localhost:5432/scix
JWT_SECRET=$MODERATOR_API_KEY
ORCHESTRATOR_BASE_URL=http://localhost:$PORT_ORCHESTRATOR
ORCHESTRATOR_MODERATOR_API_KEY=$MODERATOR_API_KEY
EOF

# Orchestrator
cd ../orchestrator
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

# 3. 启动服务
echo ""
echo "=== 启动服务 ==="

# 使用 pm2 管理进程
which pm2 >/dev/null 2>&1 || npm install -g pm2

# 停止旧进程
pm2 delete all 2>/dev/null || true

# 启动 Orchestrator
pm2 start --name orchestrator "uvicorn app.main:app --host $HOST --port $PORT_ORCHESTRATOR" --cwd orchestrator

# 启动 API
pm2 start --name api "npm run start" --cwd api

# 启动 Web
pm2 start --name web "npm run start" --cwd web

# 保存配置
pm2 save

echo ""
echo "=== 部署完成 ==="
echo ""
echo "服务端口:"
echo "  Web:      http://localhost:$PORT_WEB"
echo "  API:      http://localhost:$PORT_API"
echo "  Orchestrator: http://localhost:$PORT_ORCHESTRATOR"
echo ""
echo "对外地址: http://$EXTERNAL_IP:$EXTERNAL_PORT"
echo ""
echo "下一步:"
echo "1. 配置反向代理指向 localhost:3000"
echo "2. 配置 GitHub Webhook:"
echo "   URL: http://$EXTERNAL_IP:$EXTERNAL_PORT/api/v1/webhooks/github"
echo "   Secret: $WEBHOOK_SECRET"
