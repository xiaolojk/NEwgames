// 游戏入口 · 赤焰地牢
import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  parent: 'app',
  backgroundColor: '#0a0610',
  // 60fps 目标，允许浏览器调整到显示器刷新率
  fps: {
    target: 60,
    forceSetTimeOut: false,
    smoothStep: true,
  },
  pixelArt: false,
  // 防止 canvas 抢焦点又失去（DOM HUD 在上方，我们把 input 绑定 window）
  input: {
    keyboard: { target: window as any },
    mouse:    { target: window as any },
  },
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_W,
    height: VIEW_H,
  },
  scene: [BootScene, MenuScene, GameScene],
});

// 调试：挂到 window 上便于诊断
(window as any).__game = game;

console.log('[Crimson] 赤焰地牢 启动完毕');
