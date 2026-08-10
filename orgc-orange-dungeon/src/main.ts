// 橘子地牢 · 入口
// Orgc 橘子工作室 · Roguelike 地牢探险

import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0a0710',
  // 帧率目标：保证 60fps 流畅运行
  fps: {
    target: 60,
    min: 30,
    forceSetTimeOut: false,
    smoothStep: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    // 提升渲染性能
    powerPreference: 'high-performance',
    batchSize: 4096,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene],
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  // 阻止移动端默认手势
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  // 输出启动日志
  console.log('[Orgc] 橘子地牢 v1.0 · Orgc橘子工作室');
  console.log('[Orgc] 引擎:', Phaser.VERSION);
  (window as any).__game = game;
});
