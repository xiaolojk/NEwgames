# 橘子地牢 · 部署指南

> Orgc 橘子工作室 · Roguelike 地牢探险网页游戏

## 一、文件说明

```
orgc-orange-dungeon/
├── dist/                      # 构建产物（可直接部署）
│   ├── index.html
│   ├── assets/
│   │   └── index-XXXX.js      # 游戏主程序（约 1.5MB）
│   └── .nojekyll
├── orgc-orange-dungeon.tar.gz # 打包好的 dist（349KB）
└── README.md
```

**部署时只需要 `dist/` 目录或 `orgc-orange-dungeon.tar.gz`**，无需 Node.js 环境。

## 二、部署到你的服务器

### 方式 A：Nginx（推荐）

1. 上传 `orgc-orange-dungeon.tar.gz` 到服务器：
   ```bash
   scp orgc-orange-dungeon.tar.gz user@your-server:/tmp/
   ```

2. 解压到网站目录：
   ```bash
   ssh user@your-server
   sudo mkdir -p /var/www/orange-dungeon
   sudo tar -xzf /tmp/orgc-orange-dungeon.tar.gz -C /var/www/orange-dungeon
   ```

3. 配置 Nginx：
   ```nginx
   server {
       listen 80;
       server_name dungeon.yourdomain.com;

       root /var/www/orange-dungeon;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # 静态资源缓存
       location /assets/ {
           expires 30d;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. 重载 Nginx：
   ```bash
   sudo nginx -t && sudo nginx -s reload
   ```

### 方式 B：Apache

把 `dist/` 内容放到 `/var/www/html/orange-dungeon/`，访问 `http://your-server/orange-dungeon/`。

### 方式 C：Python 临时服务器（测试用）

```bash
tar -xzf orgc-orange-dungeon.tar.gz -C /tmp/dungeon
cd /tmp/dungeon
python3 -m http.server 8080
# 访问 http://your-server:8080
```

### 方式 D：Node.js 静态服务器

```bash
npm install -g serve
tar -xzf orgc-orange-dungeon.tar.gz -C /tmp/dungeon
serve /tmp/dungeon -l 8080
```

## 三、GitHub Pages 自动部署（可选）

仓库已配置 `.github/workflows/deploy.yml`，推送到 main 分支会自动构建并部署到 GitHub Pages。

1. 把代码推送到 GitHub 仓库
2. 仓库 Settings → Pages → Source: GitHub Actions
3. 等待 Actions 跑完，访问 `https://username.github.io/repo-name/`

## 四、手机端适配

游戏已完整适配手机端：

- **虚拟摇杆**：左下角，支持 360 度移动，死区防漂移
- **攻击按钮**：右下角红色大按钮，按下即攻击（按摇杆方向或 facing）
- **冲刺按钮**：右下角蓝色按钮
- **药水按钮**：右下角绿色按钮，快速使用第一个药水
- **横屏提示**：竖屏时显示"请横屏游玩"
- **响应式 HUD**：小屏自动缩小状态栏和 minimap

### 手机端访问注意事项

1. **必须 HTTPS**：手机浏览器的触屏 API 在 HTTP 下可能受限。建议配置 SSL 证书：
   ```bash
   sudo certbot --nginx -d dungeon.yourdomain.com
   ```

2. **添加到主屏幕**：iOS Safari 打开后点击分享 → 添加到主屏幕，可全屏运行。

3. **meta viewport**：已配置 `user-scalable=no`，防止误触缩放。

## 五、本地开发

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
```

## 六、技术栈

- Phaser 3.90（游戏引擎）
- TypeScript 5.4
- Vite 5.4（构建工具）
- 纯程序化像素画生成（零外部资源依赖）

## 七、联系方式

Orgc 橘子工作室
