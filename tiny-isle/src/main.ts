// 入口 · 小小岛 Tiny Isle
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { VIEW_W, VIEW_H } from './config';

const root = document.getElementById('game-root')!;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#87cde8',
  parent: root,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_W,
    height: VIEW_H,
  },
  scene: [BootScene, GameScene],
});

(window as any).__game = game;

// 暴露 FPS meter 便于调试（HUD 不显示，避免干扰）
console.log('[TinyIsle] 已启动，画布尺寸', VIEW_W, '×', VIEW_H);
