import Phaser from 'phaser';
import { TILE_SIZE } from '../types/game';

export class Player {
  public scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public gridR: number;
  public gridC: number;
  public moving: boolean = false;

  private body!: Phaser.GameObjects.Graphics;
  private shadow!: Phaser.GameObjects.Ellipse;
  private toolSprite!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, startC: number, startR: number, baseX: number, baseY: number) {
    this.scene = scene;
    this.gridC = startC;
    this.gridR = startR;
    const x = baseX + startC * TILE_SIZE + TILE_SIZE / 2;
    const y = baseY + startR * TILE_SIZE + TILE_SIZE / 2;
    this.container = scene.add.container(x, y);
    this.container.setDepth(50);
    this.render();
  }

  setPosition(c: number, r: number, baseX: number, baseY: number) {
    this.gridC = c;
    this.gridR = r;
    this.container.x = baseX + c * TILE_SIZE + TILE_SIZE / 2;
    this.container.y = baseY + r * TILE_SIZE + TILE_SIZE / 2;
  }

  private render(): void {
    // 阴影
    this.shadow = this.scene.add.ellipse(0, 20, 20, 6, 0x000000, 0.25);
    this.container.add(this.shadow);

    this.body = this.scene.add.graphics();
    this.drawPlayer();
    this.container.add(this.body);

    this.toolSprite = this.scene.add.graphics();
    this.drawTool('hoe');
    this.container.add(this.toolSprite);
  }

  private drawPlayer(): void {
    this.body.clear();
    // 腿
    this.body.fillStyle(0x2c3e50);
    this.body.fillRect(-9, 6, 7, 14);
    this.body.fillRect(2, 6, 7, 14);
    // 鞋
    this.body.fillStyle(0x3d2817);
    this.body.fillRect(-10, 18, 9, 4);
    this.body.fillRect(1, 18, 9, 4);
    // 衣服 - 蓝色格子衫 (星露谷主角风)
    this.body.fillStyle(0x2980b9);
    this.body.fillRect(-12, -8, 24, 18);
    this.body.lineStyle(1.5, 0x1f5d82);
    this.body.strokeRect(-12, -8, 24, 18);
    // 衣服内衬
    this.body.fillStyle(0xf1c40f);
    this.body.fillRect(-2, -8, 4, 18);
    // 皮肤 - 胳膊
    this.body.fillStyle(0xffd9a3);
    this.body.fillRect(-15, -6, 5, 12);
    this.body.fillRect(10, -6, 5, 12);
    // 头
    this.body.fillStyle(0xffd9a3);
    this.body.fillRect(-10, -24, 20, 18);
    this.body.lineStyle(1.5, 0xc08a4e);
    this.body.strokeRect(-10, -24, 20, 18);
    // 头发
    this.body.fillStyle(0x5c3317);
    this.body.fillRect(-11, -26, 22, 6);
    this.body.fillRect(-11, -26, 4, 10);
    this.body.fillRect(7, -26, 4, 10);
    // 刘海
    this.body.fillRect(-6, -22, 3, 4);
    this.body.fillRect(-1, -22, 3, 4);
    this.body.fillRect(4, -22, 3, 4);
    // 眼睛
    this.body.fillStyle(0x1a1a2e);
    this.body.fillRect(-5, -16, 2, 3);
    this.body.fillRect(3, -16, 2, 3);
    // 腮红
    this.body.fillStyle(0xffb6a6, 0.6);
    this.body.fillRect(-7, -12, 3, 2);
    this.body.fillRect(4, -12, 3, 2);
    // 嘴
    this.body.lineStyle(1, 0x7a4a2a);
    this.body.beginPath();
    this.body.arc(0, -9, 1.5, 0, Math.PI);
    this.body.strokePath();
  }

  public drawTool(tool: string): void {
    this.toolSprite.clear();
    const tx = 14;
    const ty = -2;
    switch (tool) {
      case 'hoe': // 锄头
        // 杆
        this.toolSprite.fillStyle(0x8b4513);
        this.toolSprite.fillRect(tx - 1, ty - 16, 2, 22);
        // 头
        this.toolSprite.fillStyle(0x708090);
        this.toolSprite.fillTriangle(
          tx - 6, ty - 16,
          tx + 7, ty - 16,
          tx + 7, ty - 10
        );
        this.toolSprite.fillRect(tx - 6, ty - 12, 13, 3);
        this.toolSprite.lineStyle(1, 0x445566);
        this.toolSprite.strokeRect(tx - 6, ty - 12, 13, 3);
        break;
      case 'can': // 水壶
        this.toolSprite.fillStyle(0x87ceeb);
        this.toolSprite.fillRoundedRect(tx - 6, ty - 8, 14, 14, 2);
        this.toolSprite.lineStyle(1, 0x4e8bb5);
        this.toolSprite.strokeRoundedRect(tx - 6, ty - 8, 14, 14, 2);
        // 嘴
        this.toolSprite.fillStyle(0x6a6a6a);
        this.toolSprite.fillRect(tx + 8, ty - 4, 5, 3);
        // 顶
        this.toolSprite.fillStyle(0x87ceeb);
        this.toolSprite.fillRoundedRect(tx - 3, ty - 12, 6, 5, 1);
        break;
      case 'axe': // 斧头
        this.toolSprite.fillStyle(0x8b4513);
        this.toolSprite.fillRect(tx, ty - 14, 2, 20);
        this.toolSprite.fillStyle(0x909090);
        this.toolSprite.fillTriangle(tx - 6, ty - 14, tx + 7, ty - 14, tx + 7, ty - 4);
        this.toolSprite.lineStyle(1, 0x555);
        this.toolSprite.strokeTriangle(tx - 6, ty - 14, tx + 7, ty - 14, tx + 7, ty - 4);
        break;
      case 'hand':
      case 'seed':
        // 空手/种子：画出张开的手
        this.toolSprite.fillStyle(0xffd9a3);
        this.toolSprite.fillRoundedRect(tx - 2, ty - 2, 8, 10, 2);
        this.toolSprite.lineStyle(1, 0xc08a4e);
        this.toolSprite.strokeRoundedRect(tx - 2, ty - 2, 8, 10, 2);
        if (tool === 'seed') {
          this.toolSprite.fillStyle(0xb8860b);
          this.toolSprite.fillCircle(tx + 2, ty - 4, 3);
        }
        break;
    }
  }

  moveTo(
    targetC: number,
    targetR: number,
    baseX: number,
    baseY: number,
    onComplete?: () => void
  ) {
    if (this.moving) return;
    this.moving = true;
    this.gridC = targetC;
    this.gridR = targetR;
    const tx = baseX + targetC * TILE_SIZE + TILE_SIZE / 2;
    const ty = baseY + targetR * TILE_SIZE + TILE_SIZE / 2;

    // 方向朝向：左右翻转
    if (tx < this.container.x) {
      this.container.scaleX = -1;
    } else if (tx > this.container.x) {
      this.container.scaleX = 1;
    }

    this.scene.tweens.add({
      targets: this.container,
      x: tx,
      y: ty,
      duration: 150,
      ease: 'Linear',
      onComplete: () => {
        this.moving = false;
        this.container.scaleX = 1;
        onComplete?.();
      },
    });

    // 走路小幅弹跳
    this.scene.tweens.add({
      targets: this.container,
      scaleY: Math.abs(this.container.scaleX) * 0.92,
      yoyo: true,
      duration: 75,
      ease: 'Sine.easeInOut',
    });
  }

  useToolAnimation(direction: 'up' | 'down' | 'left' | 'right' = 'down', onComplete?: () => void): void {
    // 工具挥动动画
    let rotTarget = 0;
    let yTarget = 0;
    switch (direction) {
      case 'up':
        rotTarget = -Math.PI / 3;
        yTarget = -6;
        break;
      case 'down':
        rotTarget = Math.PI / 3;
        yTarget = 6;
        break;
      case 'left':
        this.container.scaleX = -1;
        rotTarget = Math.PI / 3;
        yTarget = -2;
        break;
      case 'right':
        rotTarget = -Math.PI / 3;
        yTarget = -2;
        break;
    }

    this.scene.tweens.add({
      targets: this.toolSprite,
      rotation: rotTarget,
      y: yTarget,
      duration: 120,
      yoyo: true,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.toolSprite.setRotation(0);
        this.toolSprite.setY(0);
        this.container.scaleX = 1;
        onComplete?.();
      },
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
