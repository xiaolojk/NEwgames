import Phaser from 'phaser';
import { loadGame } from '../game/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // 天空渐变背景：使用直接绘制 Graphics 而不是 createGradientTexture（兼容性）
    this.cameras.main.setBackgroundColor('#a8e6cf');

    // 大标题
    const emojiTitle = this.add.text(width / 2, height / 2 - 130, '🌾🏡🌻', {
      fontSize: '64px',
    });
    emojiTitle.setOrigin(0.5);
    this.tweens.add({
      targets: emojiTitle,
      y: height / 2 - 140,
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut',
    });

    const title = this.add.text(width / 2, height / 2 - 50, '星露小镇', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: Math.min(width / 8, 64).toString() + 'px',
      fontStyle: 'bold',
      color: '#2e7d32',
    });
    title.setOrigin(0.5);
    title.setStroke('#ffffff', 8);
    title.setShadow(4, 4, '#00000040', 8, true, true);

    const sub = this.add.text(width / 2, height / 2 + 10, 'Stardew Mobile', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#558b2f',
      letterSpacing: 4,
    });
    sub.setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height / 2 + 50, '种田 · 收获 · 经营梦想农场', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#33691e',
    });
    subtitle.setOrigin(0.5);

    // 装饰云
    const drawCloud = (x: number, y: number, scale: number) => {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.95);
      g.fillEllipse(x, y, 60 * scale, 30 * scale);
      g.fillEllipse(x - 20 * scale, y + 8 * scale, 40 * scale, 22 * scale);
      g.fillEllipse(x + 20 * scale, y + 8 * scale, 40 * scale, 22 * scale);
      this.tweens.add({
        targets: g,
        x: g.x + 40,
        yoyo: true,
        repeat: -1,
        duration: 5000 + Math.random() * 3000,
        ease: 'Sine.easeInOut',
      });
    };
    drawCloud(width * 0.15, height * 0.15, 1);
    drawCloud(width * 0.78, height * 0.22, 0.8);
    drawCloud(width * 0.55, height * 0.1, 0.7);

    // 开始按钮
    const hasSave = loadGame() !== null;

    const btnNew = this.makeButton(width / 2 - 120, height / 2 + 130, '🌱 新的开始', 0x2e7d32, 0x4caf50, () => {
      if (hasSave) {
        this.showConfirm('开始新游戏将覆盖当前存档，确定吗？', () => {
          try { localStorage.removeItem('stardew-mobile-save-v1'); } catch {}
          this.scene.start('GameScene');
        });
      } else {
        this.scene.start('GameScene');
      }
    });

    const btnContinue = this.makeButton(width / 2 + 120, height / 2 + 130, '📂 继续游戏', 0xe65100, 0xff9800, () => {
      if (!hasSave) {
        const t = this.add.text(width / 2, height - 100, '❌ 还没有存档哦~', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '16px', color: '#c62828', backgroundColor: '#000000aa',
          padding: { x: 16, y: 8 },
        }).setOrigin(0.5);
        this.time.delayedCall(1500, () => t.destroy());
        return;
      }
      this.scene.start('GameScene');
    }, !hasSave);

    // PWA 安装提示
    this.time.delayedCall(300, () => {
      const tip = this.add.text(width / 2, height - 40,
        '💡 手机可添加到桌面获得完整APP体验',
        {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#2e7d32',
          backgroundColor: '#ffffff88',
          padding: { x: 14, y: 6 },
        }
      );
      tip.setOrigin(0.5);
    });

    void btnNew; void btnContinue;
    this.cameras.main.fadeIn(500);
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    base: number,
    hover: number,
    onClick: () => void,
    disabled = false
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setSize(200, 64);
    const bg = this.add.rectangle(0, 0, 200, 64, disabled ? 0xbdbdbd : base);
    bg.setStrokeStyle(3, disabled ? 0x9e9e9e : hover);
    bg.setAlpha(disabled ? 0.6 : 1);
    c.add(bg);
    const t = this.add.text(0, 0, label, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(t);
    c.setInteractive({ useHandCursor: !disabled });
    c.on('pointerover', () => { if (!disabled) bg.setFillStyle(hover); });
    c.on('pointerout', () => { if (!disabled) bg.setFillStyle(base); });
    c.on('pointerdown', () => {
      if (disabled) return;
      this.tweens.add({ targets: c, scale: 0.93, yoyo: true, duration: 140, ease: 'Back.easeOut' });
      this.cameras.main.flash(200, 255, 255, 255, false);
      this.time.delayedCall(120, onClick);
    });
    return c;
  }

  private showConfirm(msg: string, ok: () => void) {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.5).setOrigin(0);
    const box = this.add.rectangle(width / 2, height / 2, 360, 200, 0xffffff, 0.97);
    box.setStrokeStyle(2, 0xcccccc);
    const text = this.add.text(width / 2, height / 2 - 40, msg, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px', color: '#333', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);
    const okBtn = this.makeButton(width / 2 - 95, height / 2 + 55, '✅ 确定', 0xc62828, 0xe53935, () => {
      overlay.destroy(); box.destroy(); text.destroy();
      okBtn.destroy(); cancelBtn.destroy();
      ok();
    });
    const cancelBtn = this.makeButton(width / 2 + 95, height / 2 + 55, '❌ 取消', 0x757575, 0x9e9e9e, () => {
      overlay.destroy(); box.destroy(); text.destroy();
      okBtn.destroy(); cancelBtn.destroy();
    });
  }
}
