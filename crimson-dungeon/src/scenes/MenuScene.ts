// 主菜单场景 · 赤焰地牢
import Phaser from 'phaser';
import { VIEW_W, VIEW_H, COLORS } from '../config';
import { SaveSystem } from '../systems/SaveSystem';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    // 启动游戏时先清理所有残留模态框（防止死亡面板残留）
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
    // 清理 HUD 残留 toast 和伤害飘字
    const dl = document.getElementById('damage-layer');
    if (dl) dl.innerHTML = '';

    this.cameras.main.setBackgroundColor(COLORS.uiBg);

    // 背景粒子（小光点飘浮）
    const particles = this.add.particles(0, 0, 'pt_gold', {
      speed: { min: 5, max: 18 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.3, end: 0.05 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 3000,
      quantity: 1,
      x: { min: 0, max: VIEW_W },
      y: VIEW_H + 10,
      blendMode: Phaser.BlendModes.ADD,
    });
    particles.setDepth(-1);

    // 标题
    const title = this.add.text(VIEW_W / 2, VIEW_H * 0.25, '赤焰地牢', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ff6080',
      stroke: '#601020',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff0040', blur: 20, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      scale: 1.06,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const sub = this.add.text(VIEW_W / 2, VIEW_H * 0.25 + 70, 'C R I M S O N   D U N G E O N', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c080e0',
      letterSpacing: 6,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: sub,
      alpha: 0.6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    // 开始按钮
    const btnY = VIEW_H * 0.55;
    const hasSave = SaveSystem.exists();
    const btnTxt = hasSave ? '⚔ 继续冒险' : '⚔ 开始冒险';

    const drawBtn = (label: string, y: number, onClick: () => void, hint = '') => {
      const bg = this.add.rectangle(VIEW_W / 2, y, 320, 64, 0x301040, 0.9)
        .setStrokeStyle(3, 0xc060ff)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(VIEW_W / 2, y, label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffe0ff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const glow = () => {
        bg.setFillStyle(0x502070, 1);
        bg.setStrokeStyle(3, 0xffa0ff);
      };
      const fade = () => {
        bg.setFillStyle(0x301040, 0.9);
        bg.setStrokeStyle(3, 0xc060ff);
      };
      bg.on('pointerover', glow);
      txt.on('pointerover', glow);
      bg.on('pointerout', fade);
      txt.on('pointerout', fade);
      bg.on('pointerdown', onClick);
      txt.on('pointerdown', onClick);
      if (hint) {
        this.add.text(VIEW_W / 2 + 170, y, hint, {
          fontSize: '13px', color: '#c0a0e0',
        }).setOrigin(0, 0.5);
      }
      return { bg, txt };
    };

    drawBtn(btnTxt, btnY, () => {
      this.cameras.main.fade(400, 0, 0, 0);
      this.time.delayedCall(380, () => this.scene.start('Game'));
    });
    drawBtn(hasSave ? '🚫 删除存档 · 新游戏' : '🆕 新游戏', btnY + 90, () => {
      SaveSystem.deleteSave();
      this.cameras.main.fade(400, 0, 0, 0);
      this.time.delayedCall(380, () => this.scene.start('Game'));
    }, '按 Enter');

    // 控制说明
    const help = this.add.text(VIEW_W / 2, VIEW_H * 0.88,
      'WASD 移动  ·  左键/J 攻击  ·  空格 闪避冲刺  ·  1~5 道具  ·  E 商店\n击败每层 Boss 后走下楼梯进入下一层',
      {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#a080b0',
        align: 'center',
      }
    ).setOrigin(0.5);

    // 版本
    this.add.text(VIEW_W - 10, VIEW_H - 10, 'v1.0 · Orgc 橘子工作室', {
      fontSize: '11px', color: '#605070',
    }).setOrigin(1, 1);

    // 快捷键 Enter / 空格 直接开始
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Game'));
  }
}
