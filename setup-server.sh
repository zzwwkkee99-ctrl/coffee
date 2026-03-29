#!/bin/bash
# ============================================================
# Coffee Card 项目 - 服务器首次初始化脚本
# 用法: bash setup-server.sh
# ============================================================

set -e

SERVER_IP="43.138.114.188"
SERVER_PORT="16616"
SERVER_USER="ubuntu"
SSH_CMD="ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP}"

echo "🚀 开始初始化远端服务器..."

# -----------------------------------------------------------
# 1. 创建项目目录结构
# -----------------------------------------------------------
echo "📁 创建项目目录..."
${SSH_CMD} "mkdir -p /home/ubuntu/coffee/{server,admin-web/dist,public/admin,public/customer}"

# -----------------------------------------------------------
# 2. 安装 Node.js (如果尚未安装)
# -----------------------------------------------------------
echo "📦 检查 Node.js..."
${SSH_CMD} << 'ENDSSH'
if ! command -v node &> /dev/null; then
    echo "🔧 安装 Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js 已安装: $(node -v)"
fi
ENDSSH

# -----------------------------------------------------------
# 3. 安装 PM2 (如果尚未安装)
# -----------------------------------------------------------
echo "📦 检查 PM2..."
${SSH_CMD} << 'ENDSSH'
if ! command -v pm2 &> /dev/null; then
    echo "🔧 安装 PM2..."
    sudo npm install -g pm2
    pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true
else
    echo "✅ PM2 已安装: $(pm2 -v)"
fi
ENDSSH

# -----------------------------------------------------------
# 4. 创建服务器端 .env 文件
# -----------------------------------------------------------
echo "📝 创建服务器端 .env..."
${SSH_CMD} << 'ENDSSH'
cat > /home/ubuntu/coffee/server/.env << 'EOF'
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=coffee_user
DB_PASSWORD=Coffee2026!Secure#Key
DB_NAME=coffee_card
JWT_SECRET=cf-jwt-x7k9m2p4q8r1s5t3w6y0z
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
EOF
echo "✅ .env 文件已创建"
ENDSSH

# -----------------------------------------------------------
# 5. 配置 Nginx
# -----------------------------------------------------------
echo "🌐 配置 Nginx..."
${SSH_CMD} << 'ENDSSH'
# 检查 nginx 是否已安装
if ! command -v nginx &> /dev/null; then
    echo "⚠️  Nginx 未安装，请先安装 Nginx"
    exit 1
fi

# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/coffee.conf > /dev/null << 'NGINX'
server {
    listen 80;
    server_name 43.138.114.188;

    # Admin Web (React SPA)
    location /admin-web/ {
        alias /home/ubuntu/coffee/admin-web/dist/;
        try_files $uri $uri/ /admin-web/index.html;
    }

    # H5 Admin
    location /h5/admin/ {
        alias /home/ubuntu/coffee/public/admin/;
        try_files $uri $uri/ =404;
    }

    # H5 Customer
    location /h5/customer/ {
        alias /home/ubuntu/coffee/public/customer/;
        try_files $uri $uri/ =404;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

# 启用站点配置
sudo ln -sf /etc/nginx/sites-available/coffee.conf /etc/nginx/sites-enabled/coffee.conf

# 测试 & 重载 Nginx
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx 配置完成"
ENDSSH

echo ""
echo "============================================"
echo "✅ 服务器初始化完成！"
echo "   接下来请运行: bash deploy.sh"
echo "============================================"
