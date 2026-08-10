// BootScene · 启动场景
// 生成所有像素资产，然后切换到菜单
import Phaser from 'phaser';
import { generateAllTextures } from '../render/PixelArt';
import { COLORS, VIEW_W, VIEW_H } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 无外部资源
  }

  create() {
    // 显示加载文字
    const txt = this.add.text(VIEW_W / 2, VIEW_H / 2, '橘子地牢 加载中…', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#ffaa30',
    }).setOrigin(0.5);

    // 生成所有像素纹理
    this.time.delayedCall(50, () => {
      try {
        generateAllTextures(this);
        txt.setText('加载完成');
        this.time.delayedCall(100, () => {
          this.scene.start('Menu');
        });
      } catch (e) {
        console.error('[Orgc] 资产生成失败', e);
        txt.setText('资源加载失败: ' + (e as Error).message);
      }
    });
  }
}
