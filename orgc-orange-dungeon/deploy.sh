#!/usr/bin/env bash
# 橘子地牢 · 服务器一键部署脚本
# 用法：bash deploy.sh
# Orgc 橘子工作室

set -e

RELEASE_URL="https://github.com/xiaolojk/NEwgames/releases/download/v1.0.0/dungeon-deploy.tar.gz"
WEB_ROOT="/var/www/orange-dungeon"
NGINX_CONF="/etc/nginx/sites-available/orange-dungeon"

echo "================================================"
echo "  橘子地牢 · 服务器一键部署"
echo "  Orgc 橘子工作室"
echo "================================================"

# 1. 安装依赖
echo "[1/6] 检查并安装依赖..."
if ! command -v nginx &> /dev/null; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx curl tar
else
  echo "  nginx 已安装，跳过"
fi

# 2. 创建 Web 根目录
echo "[2/6] 创建 Web 目录..."
mkdir -p "$WEB_ROOT"
rm -rf "${WEB_ROOT:?}/"*

# 3. 下载并解压构建产物
echo "[3/6] 下载游戏构建产物..."
TMP_TAR="/tmp/dungeon-deploy-$$.tar.gz"
curl -fSL --retry 3 -o "$TMP_TAR" "$RELEASE_URL"
tar -xzf "$TMP_TAR" -C "$WEB_ROOT"
rm -f "$TMP_TAR"
chmod -R 755 "$WEB_ROOT"
echo "  已解压到 $WEB_ROOT"
ls -lh "$WEB_ROOT" | head -5

# 4. 写入 Nginx 配置
echo "[4/6] 写入 Nginx 配置..."
cat > "$NGINX_CONF" <<'NGINX_EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/orange-dungeon;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
}
NGINX_EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 5. 测试并重启 Nginx
echo "[5/6] 测试并重启 Nginx..."
nginx -t
systemctl restart nginx
systemctl enable nginx

# 6. 防火墙
echo "[6/6] 配置防火墙..."
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 30022/tcp 2>/dev/null || true

# 获取公网 IP
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 icanhazip.com 2>/dev/null || echo "服务器IP")

echo ""
echo "================================================"
echo "  ✅ 部署完成！"
echo "================================================"
echo ""
echo "  访问地址:  http://$PUBLIC_IP"
echo "  本机访问:  http://localhost"
echo "  游戏目录:  $WEB_ROOT"
echo ""
echo "  手机端请横屏游玩，触屏控制会自动启用"
echo "================================================"
