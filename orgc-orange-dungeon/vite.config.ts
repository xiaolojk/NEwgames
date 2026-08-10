import { defineConfig } from 'vite';
import obfuscator from 'rollup-plugin-obfuscator';

// 橘子地牢 · 构建配置
// 启用代码混淆防止反编译，保护游戏逻辑
// Orgc 橘子工作室
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    // 先用 esbuild 做基本压缩，再用 obfuscator 做强混淆
    minify: 'esbuild',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 单文件打包，减少信息泄露面
        manualChunks: undefined,
        // 文件名加 hash 防缓存
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [
    obfuscator({
      options: {
        // 压缩：移除注释、换行
        compact: true,
        // 控制流扁平化：让逻辑难以跟踪
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        // 死代码注入：干扰逆向分析
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        // 调试保护：开发者工具打开时无限 debugger（移动端关闭，避免误伤）
        debugProtection: false,
        debugProtectionInterval: 0,
        // 禁用 console（保留 error 用于排错）
        disableConsoleOutput: false,
        // 标识符混淆
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        // 字符串数组加密：把字符串抽到数组并加密
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.8,
        stringArrayWrappersCount: 2,
        stringArrayWrappersType: 'function',
        stringArrayWrappersChainedCalls: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        // 拆分字符串
        splitStrings: true,
        splitStringsChunkLength: 8,
        // 数字常量混淆
        numbersToExpressions: true,
        // 自我防御：防格式化（关掉，某些浏览器会误伤）
        selfDefending: false,
        // 变换对象键
        transformObjectKeys: true,
        // Unicode 转义序列
        unicodeEscapeSequence: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
