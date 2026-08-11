#!/usr/bin/env bash
set -e
echo "============================================"
echo "  🌾 星露小镇 Stardew Mobile 一键部署"
echo "============================================"
echo ""

if ! command -v gh &> /dev/null; then
    echo "❌ 请先安装 GitHub CLI (gh): https://cli.github.com"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "⚠️  未登录 GitHub，正在启动登录..."
    gh auth login --web
fi

GITHUB_USER=$(gh api user --jq .login)
echo "✅ GitHub 用户: $GITHUB_USER"

REPO_NAME="stardew-mobile"
REPO_DESC="🌾 星露谷物语风格手机版农场游戏 | 种田/收获/四季/天气/商店/PWA可安装离线使用"

cd "$(dirname "$0")"

if gh repo view "$GITHUB_USER/$REPO_NAME" &>/dev/null; then
    echo "📂 仓库已存在: $GITHUB_USER/$REPO_NAME"
else
    echo "📦 创建 GitHub 仓库..."
    gh repo create "$REPO_NAME" --public --description "$REPO_DESC" --enable-issues --enable-wiki || true
fi

if [ ! -d .git ]; then
    git init
    git config user.name "$GITHUB_USER"
    git config user.email "$GITHUB_USER@users.noreply.github.com"
fi

if ! git remote | grep -q origin; then
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
else
    git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi

git branch -M main

echo "📝 提交代码..."
git add -A
git commit -m "🌾 feat: 星露小镇 v1.0.0 初始发布

- 核心玩法：9x7 农场，翻地/播种/浇水/收获
- 8种作物（防风草/土豆/草莓/蓝莓/番茄/玉米/南瓜/蔓越莓）
- 时间/季节/天气/体力 系统
- 商店购买种子，背包出售作物
- 睡觉推进一天，雨天自动浇水
- 手机触控+键盘双操作
- PWA：可安装到桌面 + 离线可用
- GitHub Pages 自动部署工作流" || echo "  (无新变更)"

echo "🚀 推送代码..."
git push -u origin main --force

echo "🔧 配置 GitHub Pages (Actions 模式)..."
gh api --method PUT -H "Accept: application/vnd.github+json" \
    "/repos/$GITHUB_USER/$REPO_NAME/pages" \
    -f build_type=workflow -f source.branch=main || true

sleep 3

RUN_ID=$(gh run list --workflow "deploy.yml" -L 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")

echo ""
echo "============================================"
echo "  ✅ 部署启动成功！"
echo "============================================"
echo ""
echo "📂 仓库：https://github.com/$GITHUB_USER/$REPO_NAME"
if [ -n "$RUN_ID" ]; then
    echo "🏃 构建日志：https://github.com/$GITHUB_USER/$REPO_NAME/actions/runs/$RUN_ID"
    echo "   (等待约 2-3 分钟完成构建部署)"
fi
echo ""
echo "🎮 游戏网址（部署成功后访问）："
echo "   👉  https://$GITHUB_USER.github.io/$REPO_NAME/"
echo ""
echo "📱 手机安装方法："
echo "   Safari/Chrome打开上述网址 → 分享/菜单 → 添加到主屏幕"
echo "   即可获得原生APP体验，可离线游玩！"
echo ""
echo "🌱 祝你种田愉快！🌾🌻🎃"
echo ""
