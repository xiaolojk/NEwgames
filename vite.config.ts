import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5174,
    host: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.svg'],
      manifest: {
        name: '星露小镇 - Stardew Mobile',
        short_name: '🌾 星露小镇',
        description: '星露谷物语风格的农场模拟游戏，种田、收获、经营你的梦想农场！',
        theme_color: '#5a9c3e',
        background_color: '#87ceeb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        lang: 'zh-CN',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
        shortcuts: [
          {
            name: '开始新的一天',
            short_name: '新的一天',
            url: './',
            icons: [{ src: 'icon.svg', sizes: 'any' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,jpg,json}'],
        runtimeCaching: [],
      },
    }),
  ],
});
