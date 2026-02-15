#!/bin/bash
# SciX Cloudflare Tunnel 启动脚本

echo "=== 安装 cloudflared ==="

# 检测系统
if [ "$(uname)" = "Darwin" ]; then
    # macOS
    brew install cloudflared
elif [ "$(uname)" = "Linux" ]; then
    # Linux
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        ARCH="amd64"
    elif [ "$ARCH" = "aarch64" ]; then
        ARCH="arm64"
    fi

    # 下载
    curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}" -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
fi

echo ""
echo "=== 启动服务 + Tunnel ==="

# 启动 Web (后台)
cd /opt/sciland/web
pm2 start --name web "npm run start" 2>/dev/null || pm2 start --name web "npm start"

# 启动 API (后台)
cd /opt/sciland/api
pm2 start --name api "npm run start" 2>/dev/null || pm2 start --name api "npm start"

# 启动 Orchestrator (后台)
cd /opt/sciland/orchestrator
pm2 start --name orchestrator "uvicorn app.main:app --host 0.0.0.0 --port 8000"

# 等待服务启动
sleep 3

# 启动 Tunnel
echo ""
echo "=== 启动 Cloudflare Tunnel ==="
cloudflared tunnel --url http://localhost:3000
