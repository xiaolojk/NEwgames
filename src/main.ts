import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

// 游戏逻辑尺寸（设计分辨率），然后Scale模式负责适配手机屏幕
const LOGICAL_W = 720;
const LOGICAL_H = 1280;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#87ceeb',
  pixelArt: false,
  antialias: true,
  autoRound: true,
  scale: {
    mode: Phaser.Scale.RESIZE, // 动态尺寸，GameScene内自行缩放
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_W,
    height: LOGICAL_H,
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, GameScene],
};

new Phaser.Game(config);

// PWA 提示安装（可选）
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
let deferredPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
});

// 提供给window，可点击按钮触发安装
(window as unknown as { __installPwa?: () => void }).__installPwa = async () => {
  if (!deferredPrompt) {
    alert('✨ 当前浏览器不支持自动安装，请使用"添加到主屏幕/桌面"手动添加～');
    return;
  }
  await deferredPrompt.prompt();
  deferredPrompt = null;
};
