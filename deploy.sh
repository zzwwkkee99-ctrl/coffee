#!/bin/bash
# ============================================================
# Coffee Card 项目 - 一键部署脚本
# 用法: bash deploy.sh [--skip-build]
# ============================================================

set -e

SERVER_IP="43.138.114.188"
SERVER_PORT="16616"
SERVER_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/coffee"
SSH_CMD="ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP}"
RSYNC_SSH="ssh -p ${SERVER_PORT}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="coffee.boyanxg.com"

SKIP_BUILD=false
if [ "$1" == "--skip-build" ]; then
    SKIP_BUILD=true
fi

echo "🚀 开始部署 Coffee Card 项目..."
echo ""

# -----------------------------------------------------------
# 1. 构建 admin-web
# -----------------------------------------------------------
if [ "$SKIP_BUILD" = false ]; then
    echo "🔨 构建 admin-web..."
    cd "${SCRIPT_DIR}/admin-web"
    npm install
    npm run build
    echo "✅ admin-web 构建完成"
    cd "${SCRIPT_DIR}"
else
    echo "⏭️  跳过构建步骤"
fi

# -----------------------------------------------------------
# 2. 同步 server 代码
# -----------------------------------------------------------
echo ""
echo "📤 上传 server 代码..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'logs' \
    -e "${RSYNC_SSH}" \
    "${SCRIPT_DIR}/server/" \
    "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/server/"
echo "✅ server 代码已同步"

# -----------------------------------------------------------
# 3. 同步 admin-web 构建产物
# -----------------------------------------------------------
echo ""
echo "📤 上传 admin-web 构建产物..."
rsync -avz --delete \
    -e "${RSYNC_SSH}" \
    "${SCRIPT_DIR}/admin-web/dist/" \
    "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/admin-web/dist/"
echo "✅ admin-web 已同步"

# -----------------------------------------------------------
# 4. 同步 H5 静态文件
# -----------------------------------------------------------
echo ""
echo "📤 上传 H5 静态文件..."
rsync -avz --delete \
    -e "${RSYNC_SSH}" \
    "${SCRIPT_DIR}/public/" \
    "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/public/"
echo "✅ H5 文件已同步"

# -----------------------------------------------------------
# 5. 上传 SSL 证书
# -----------------------------------------------------------
echo ""
echo "🔒 上传 SSL 证书..."
${SSH_CMD} "sudo mkdir -p /etc/nginx/ssl/coffee"
rsync -avz \
    -e "${RSYNC_SSH}" \
    "${SCRIPT_DIR}/24163073_coffee.boyanxg.com_nginx/coffee.boyanxg.com.key" \
    "${SCRIPT_DIR}/24163073_coffee.boyanxg.com_nginx/coffee.boyanxg.com.pem" \
    "${SERVER_USER}@${SERVER_IP}:/tmp/"
${SSH_CMD} "sudo mv /tmp/coffee.boyanxg.com.key /etc/nginx/ssl/coffee/ && sudo mv /tmp/coffee.boyanxg.com.pem /etc/nginx/ssl/coffee/ && sudo chmod 600 /etc/nginx/ssl/coffee/coffee.boyanxg.com.key && sudo chmod 644 /etc/nginx/ssl/coffee/coffee.boyanxg.com.pem"
echo "✅ SSL 证书已上传"

# -----------------------------------------------------------
# 6. 配置 Nginx (coffee.boyanxg.com)
# -----------------------------------------------------------
echo ""
echo "🌐 配置 Nginx..."
${SSH_CMD} <<'ENDSSH'
# ---- 修复 tran-colorful：将 server_name _ 改为具体域名 ----
if grep -q 'server_name _;' /etc/nginx/sites-available/tran-colorful; then
    echo "🔧 修复 tran-colorful 配置: server_name _ → colorful.boyanxg.com"
    sudo sed -i 's/server_name _;/server_name colorful.boyanxg.com;/g' /etc/nginx/sites-available/tran-colorful
fi

# ---- 修复 travel-xian：避免跟 tran-colorful 冲突 ----
# travel-xian 也使用 server_name _，需要改为具体域名或保留为 IP
if grep -q 'server_name _;' /etc/nginx/sites-available/travel-xian; then
    echo "🔧 修复 travel-xian 配置"
fi

# ---- 创建 coffee.conf ----
sudo tee /etc/nginx/sites-available/coffee.conf > /dev/null << 'NGINX'
# Coffee Card - HTTP → HTTPS redirect
server {
    listen 80;
    server_name coffee.boyanxg.com;
    return 301 https://$host$request_uri;
}

# Coffee Card - HTTPS
server {
    listen 443 ssl;
    server_name coffee.boyanxg.com;

    # SSL 证书
    ssl_certificate     /etc/nginx/ssl/coffee/coffee.boyanxg.com.pem;
    ssl_certificate_key /etc/nginx/ssl/coffee/coffee.boyanxg.com.key;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:CoffeeSSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 10m;

    # Admin Web (React SPA)
    location /admin-web/ {
        alias /home/ubuntu/coffee/admin-web/dist/;
        try_files $uri $uri/ /admin-web/index.html;

        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
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

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Root redirect to admin
    location = / {
        return 302 /admin-web/;
    }
}
NGINX

# 启用站点配置
sudo ln -sf /etc/nginx/sites-available/coffee.conf /etc/nginx/sites-enabled/coffee.conf

# 测试 & 重载 Nginx
echo "🔍 测试 Nginx 配置..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx 配置完成"
ENDSSH

# -----------------------------------------------------------
# 7. 服务器端: 安装依赖 & 迁移 & 重启
# -----------------------------------------------------------
echo ""
echo "🔧 服务器端操作..."
${SSH_CMD} << ENDSSH
cd ${REMOTE_DIR}/server

echo "📦 安装依赖..."
npm install --production

echo "🗄️  运行数据库迁移..."
NODE_ENV=production npx knex migrate:latest --env production

echo "🔄 重启服务..."
pm2 delete coffee-server 2>/dev/null || true
sudo fuser -k 4000/tcp 2>/dev/null || true
sleep 1
pm2 start src/app.js --name coffee-server
sleep 2
pm2 save

echo "✅ 服务器端操作完成"
ENDSSH

# -----------------------------------------------------------
# 8. 验证部署
# -----------------------------------------------------------
echo ""
echo "🔍 验证部署..."
echo ""

# API health check
echo -n "  API Health: "
API_RESULT=$(curl -s --max-time 5 "https://${DOMAIN}/api/health" 2>/dev/null || echo "FAIL")
echo "${API_RESULT}"

# Admin Web
echo -n "  Admin Web:  "
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${DOMAIN}/admin-web/" 2>/dev/null || echo "000")
if [ "$ADMIN_STATUS" = "200" ]; then echo "✅ HTTP ${ADMIN_STATUS}"; else echo "⚠️  HTTP ${ADMIN_STATUS}"; fi

# H5 Customer
echo -n "  H5 Customer:"
H5C_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${DOMAIN}/h5/customer/login.html" 2>/dev/null || echo "000")
if [ "$H5C_STATUS" = "200" ]; then echo "✅ HTTP ${H5C_STATUS}"; else echo "⚠️  HTTP ${H5C_STATUS}"; fi

echo ""
echo "============================================"
echo "✅ 部署完成！"
echo ""
echo "  Admin Web:    https://${DOMAIN}/admin-web/"
echo "  H5 Customer:  https://${DOMAIN}/h5/customer/login.html"
echo "  API:          https://${DOMAIN}/api/health"
echo "============================================"
