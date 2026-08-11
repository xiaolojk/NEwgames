# 🌾 星露小镇 - Stardew Mobile

> **星露谷物语风格的手机版农场模拟游戏** | PWA 可安装到桌面 + 离线可用  
> 技术栈：Phaser 3 · TypeScript · Vite · vite-plugin-pwa

[![Deploy to GitHub Pages](https://github.com/stardew-mobile/stardew-mobile/actions/workflows/deploy.yml/badge.svg)](https://github.com/stardew-mobile/stardew-mobile/actions/workflows/deploy.yml)

---

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| 🌱 **农场系统** | 9×7 田地，支持翻地 / 播种 / 浇水 / 收获 |
| 🌾 **8 种作物** | 防风草、土豆、草莓、蓝莓、番茄、玉米、南瓜、蔓越莓 |
| 🌷 **四季循环** | 春/夏/秋/冬 × 28天，换季作物自动枯萎 |
| 🌤 **天气系统** | 晴天/雨天/阴天，雨天自动浇全部地块 |
| ⚡ **体力系统** | 每种操作消耗体力，睡觉自动恢复 |
| 💰 **金币 & 商店** | 买种子、卖收获的作物，经营你的农场 |
| 🎒 **背包系统** | 管理种子库存和收获 |
| 🕑 **时间系统** | 6:00 → 26:00，时间流动影响作物生长 |
| 💾 **自动存档** | 实时 localStorage 持久化，游戏不丢失 |
| 📱 **PWA 安装** | 添加到主屏幕，获得原生APP体验 + 离线可玩 |
| 👆 **手机触控** | 大按钮 + 触摸优先设计，键盘也能玩 |

---

## 🎮 操作指南

### 📱 手机 / 触屏

| 操作 | 方式 |
|------|------|
| 玩家移动 | 左下角虚拟方向键 或 点按屏幕 |
| 对目标地块使用工具 | 先点下方工具栏选工具 → 点地块 |
| 使用锄头 → 翻地 | 🟫 工具栏锄头 (消耗 2 体力) |
| 浇水壶 → 浇水 | 💧 工具栏浇水壶 (消耗 1 体力) |
| 种子播种 | 🌱 先切到种子工具，到商店买种子并点击选中 |
| 收获 / 锄头挖土 | ✋ 镰刀 (收获) / 锄头 (挖土) |
| 进入商店 | 🛒 屏幕右侧按钮 |
| 背包/出售 | 🎒 屏幕右侧按钮 |
| 睡觉（次日） | 🏠 屏幕右侧按钮 → 确认睡觉 |
| 手动存档 | 💾 屏幕右侧按钮（其实会自动存） |

### 🖥 电脑 / 键盘

| 操作 | 按键 |
|------|------|
| 移动 | ↑ ↓ ← → / W A S D |
| 使用工具 | 空格 / 回车 / F (对当前朝向格子) |
| 切换工具 | 1 2 3 4 5 或 工具栏 |

---

## 🚀 在线游玩

👉 **[点击进入游戏](https://stardew-mobile.github.io/stardew-mobile/)**（部署完成后生效）

### 📱 安装到手机桌面（推荐！）
- **iOS (Safari)**：打开网址 → 点底部「分享」→「添加到主屏幕」
- **Android (Chrome)**：打开网址 → 右上角「⋯」→「添加到主屏幕/安装应用」
- 添加完成后，从桌面图标进入 = 全屏无浏览器UI + 可离线玩！

---

## 🧩 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/<your-username>/stardew-mobile.git
cd stardew-mobile

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:5174

# 4. 构建生产版本（含 PWA）
npm run build

# 5. 本地预览构建结果
npm run preview
```

---

## 📦 一键部署到 GitHub Pages

项目已经内置 **GitHub Actions** 自动部署工作流，推送到 `main` 分支会自动构建并部署到 Pages。

### 方式 A：一键脚本（推荐）
```bash
# 确保已安装 GitHub CLI (gh) 并登录
./deploy.sh
# 脚本会自动：创建仓库 → 推送代码 → 配置 Pages → 打印可玩链接！
```

### 方式 B：手动
1. GitHub 新建仓库 `stardew-mobile`（Public）
2. 仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 推送代码：
   ```bash
   git init && git add -A && git commit -m "init"
   git remote add origin https://github.com/<you>/stardew-mobile.git
   git push -u origin main
   ```
4. 等待 Actions 构建完成 → 访问 `https://<you>.github.io/stardew-mobile/`

---

## 📁 项目结构

```
stardew-mobile/
├── public/                       # 静态资源（图标 / manifest）
│   ├── icon.svg / icon-192.svg / icon-512.svg
│   └── favicon.svg
├── src/
│   ├── types/
│   │   └── game.ts               # 类型定义：作物 / 地块 / 工具 / 状态
│   ├── game/
│   │   ├── GameState.ts          # 核心状态机：时间推进、存档、生长
│   │   ├── FarmRenderer.ts       # 农场绘制：地块、作物、季节颜色
│   │   └── Player.ts             # 玩家：移动、朝向、动画
│   ├── scenes/
│   │   ├── BootScene.ts          # 启动页：新的开始 / 继续
│   │   └── GameScene.ts          # 主场景：UI + 操作 + 面板 + 循环
│   ├── main.ts                   # Phaser 配置 + PWA 安装
│   ├── index.css
│   └── vite-env.d.ts
├── .github/workflows/deploy.yml  # GitHub Pages 自动部署
├── deploy.sh                     # 一键部署脚本
├── vite.config.ts                # Vite + PWA 插件配置
├── tsconfig.json
└── package.json
```

---

## 💡 玩法小贴士

1. **第1天**：去商店买 5 颗防风草种子 → 用锄头翻地 → 播种 → 浇水 → 睡觉 → 第 4 天左右收获！
2. **雨天**：睡到自然醒，发现所有地都被雨浇好了～ 省下体力多翻几块地。
3. **换季前**：记得把还没收的作物收掉，换季会枯萎。
4. **体力为 0**：还能操作但会疲劳提示，睡一觉就回满了！
5. **出售作物**：🎒 背包里点击「全部卖出」换金币，再去买下一季的种子。

---

## 📄 License

MIT © 祝你种田愉快 🌾🌻🎃🍓
