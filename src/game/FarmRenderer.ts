import Phaser from 'phaser';
import { TILE_SIZE, TileState, CropStage, Tile, CROPS, Season } from '../types/game';
import { SEASON_INFO } from '../game/GameState';

export class FarmRenderer {
  private scene: Phaser.Scene;
  private tileGraphics: Phaser.GameObjects.Graphics[] = [];
  private cropSprites: (Phaser.GameObjects.Container | null)[][] = [];
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(scene: Phaser.Scene, offsetX: number, offsetY: number) {
    this.scene = scene;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  destroy(): void {
    for (const g of this.tileGraphics) g.destroy();
    for (const row of this.cropSprites) {
      for (const s of row) s?.destroy();
    }
    this.tileGraphics = [];
    this.cropSprites = [];
  }

  render(tiles: Tile[][], season: Season): void {
    this.destroy();
    const rows = tiles.length;
    const cols = tiles[0].length;

    for (let r = 0; r < rows; r++) {
      this.cropSprites[r] = [];
      for (let c = 0; c < cols; c++) {
        const tile = tiles[r][c];
        const x = this.offsetX + c * TILE_SIZE;
        const y = this.offsetY + r * TILE_SIZE;
        this.drawTile(x, y, tile, season, r, c);
      }
    }
  }

  updateTile(tile: Tile, r: number, c: number, season: Season): void {
    const x = this.offsetX + c * TILE_SIZE;
    const y = this.offsetY + r * TILE_SIZE;
    // 销毁旧的地块图形（如果有）和作物精灵
    const old = this.cropSprites[r]?.[c];
    if (old) {
      old.destroy();
      this.cropSprites[r][c] = null;
    }
    this.drawTile(x, y, tile, season, r, c);
  }

  private drawTile(x: number, y: number, tile: Tile, season: Season, r: number, c: number): void {
    const info = SEASON_INFO[season];

    if (tile.state === TileState.GRASS) {
      // 草地
      const g = this.scene.add.graphics();
      g.fillStyle(0x5a9c3e);
      g.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      // 草丛小点/纹理
      g.fillStyle(0x4e8c34);
      const seed = (r * 7 + c * 13) % 11;
      g.fillRect(x + 6 + seed, y + 10, 3, 6);
      g.fillRect(x + 30 - seed, y + 22, 3, 5);
      g.fillRect(x + 18, y + 40 + seed, 3, 6);
      g.fillStyle(0x6fb051);
      g.fillRect(x + 48, y + 14 - seed, 3, 6);
      // 边界微亮线
      g.lineStyle(1, 0x4e8c34, 0.5);
      g.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      g.setDepth(1);
      this.tileGraphics.push(g);
      return;
    }

    // 土壤/已翻地
    const g = this.scene.add.graphics();

    // 土壤底层
    g.fillStyle(tile.wetToday ? 0x6b3d12 : 0x8b5a2b);
    g.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // 翻地垄沟
    if (tile.state >= TileState.TILLED) {
      g.fillStyle(tile.wetToday ? 0x5a3010 : 0x7a4a20);
      for (let i = 0; i < 5; i++) {
        const yy = y + 8 + i * 12;
        g.fillRect(x + 4, yy, TILE_SIZE - 8, 4);
      }
    }

    // 浇水过：深色斑点
    if (tile.wetToday) {
      g.fillStyle(0x3d1f08, 0.5);
      g.fillCircle(x + 14, y + 18, 5);
      g.fillCircle(x + 40, y + 30, 6);
      g.fillCircle(x + 24, y + 46, 4);
      g.fillCircle(x + 50, y + 52, 4);
    }

    // 边界
    g.lineStyle(1, tile.wetToday ? 0x4a2810 : 0x6b4520, 0.6);
    g.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    g.setDepth(1);
    this.tileGraphics.push(g);

    // 种子/作物
    if (tile.state >= TileState.SEEDED && tile.cropId) {
      const crop = CROPS[tile.cropId];
      if (!crop) return;
      const container = this.scene.add.container(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
      container.setDepth(2 + r * 0.01);
      this.drawCrop(container, tile, r, c);
      this.cropSprites[r][c] = container;
    }
  }

  private drawCrop(container: Phaser.GameObjects.Container, tile: Tile, _r: number, _c: number): void {
    if (!tile.cropId) return;
    const crop = CROPS[tile.cropId];
    const stage: CropStage = tile.state === TileState.READY ? 4 : tile.stage;

    switch (stage) {
      case 0: // 种子
      case 1: // 发芽
        this.drawSprout(container, stage);
        break;
      case 2: // 幼苗
        this.drawSapling(container, crop.color);
        break;
      case 3: // 中期
        this.drawGrowing(container, crop.color, crop.id);
        break;
      case 4: // 可收获
        this.drawReady(container, crop);
        break;
    }
  }

  private drawSprout(container: Phaser.GameObjects.Container, stage: 0 | 1): void {
    const g = this.scene.add.graphics();
    if (stage === 0) {
      // 土壤中冒出小绿芽尖
      g.fillStyle(0x2e8b57);
      g.fillRect(-2, 12, 4, 6);
    } else {
      // 两片小叶子
      g.fillStyle(0x3cb371);
      g.fillEllipse(-7, 6, 8, 4);
      g.fillEllipse(7, 6, 8, 4);
      g.fillStyle(0x2e8b57);
      g.fillRect(-2, 0, 4, 14);
    }
    container.add(g);
  }

  private drawSapling(container: Phaser.GameObjects.Container, color: number): void {
    const g = this.scene.add.graphics();
    // 茎
    g.fillStyle(0x228b22);
    g.fillRect(-3, -6, 6, 22);
    // 多片叶子
    g.fillStyle(0x3cb371);
    g.fillEllipse(-13, -4, 10, 5);
    g.fillEllipse(13, -2, 10, 5);
    g.fillEllipse(-9, 4, 9, 5);
    g.fillEllipse(9, 6, 9, 5);
    // 顶芽
    g.fillStyle(0x7ccf7c);
    g.fillCircle(0, -10, 4);
    container.add(g);
  }

  private drawGrowing(container: Phaser.GameObjects.Container, color: number, cropId: string): void {
    const g = this.scene.add.graphics();
    // 茎
    g.fillStyle(0x228b22);
    g.fillRect(-4, -16, 8, 30);
    // 叶子
    g.fillStyle(0x3cb371);
    g.fillEllipse(-16, -6, 13, 6);
    g.fillEllipse(16, -4, 13, 6);
    g.fillEllipse(-12, 6, 11, 6);
    g.fillEllipse(12, 8, 11, 6);
    // 初花/初果
    g.fillStyle(color);
    if (cropId === 'tomato' || cropId === 'strawberry') {
      g.fillCircle(-6, -18, 5);
      g.fillCircle(6, -16, 4);
    } else if (cropId === 'pumpkin') {
      g.fillCircle(0, 0, 10);
    } else if (cropId === 'corn') {
      g.fillStyle(0xffd700);
      g.fillEllipse(0, -18, 7, 12);
    } else {
      g.fillCircle(0, -20, 5);
    }
    container.add(g);
  }

  private drawReady(container: Phaser.GameObjects.Container, crop: typeof CROPS[string]): void {
    const g = this.scene.add.graphics();
    // 茎和叶子
    g.fillStyle(0x228b22);
    g.fillRect(-3, -8, 6, 22);
    g.fillStyle(0x3cb371);
    g.fillEllipse(-14, 0, 11, 5);
    g.fillEllipse(14, 2, 11, 5);
    container.add(g);

    // 果实 / 收获物
    const fruit = this.scene.add.container(0, -18);
    const emoji = this.scene.add.text(0, 0, crop.emoji, {
      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
      fontSize: crop.id === 'corn' || crop.id === 'pumpkin' ? '28px' : '24px',
    });
    emoji.setOrigin(0.5, 0.5);
    fruit.add(emoji);
    container.add(fruit);

    // 发光光圈（可收获提示）
    const glow = this.scene.add.graphics();
    glow.fillStyle(0xffff00, 0.0);
    glow.fillCircle(0, -18, 20);
    container.add(glow);

    // 轻微上下浮动
    this.scene.tweens.add({
      targets: fruit,
      y: -22,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeInOut',
    });

    // 闪烁光环
    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0, to: 0.35 },
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeInOut',
    });
  }

  // 视觉动画：玩家点击地块后的动作反馈
  playTileEffect(r: number, c: number, kind: 'hoe' | 'water' | 'seed' | 'harvest') {
    const x = this.offsetX + c * TILE_SIZE + TILE_SIZE / 2;
    const y = this.offsetY + r * TILE_SIZE + TILE_SIZE / 2;

    if (kind === 'hoe') {
      const p = this.scene.add.rectangle(x, y, TILE_SIZE * 0.7, TILE_SIZE * 0.7, 0x8b5a2b, 0.0);
      this.scene.tweens.add({
        targets: p,
        alpha: { from: 0.5, to: 0 },
        duration: 280,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    } else if (kind === 'water') {
      // 水滴落下粒子
      for (let i = 0; i < 7; i++) {
        const drop = this.scene.add.rectangle(
          x + Phaser.Math.Between(-20, 20),
          y + Phaser.Math.Between(-24, -6),
          3,
          6,
          0x4da6ff
        );
        this.scene.tweens.add({
          targets: drop,
          y: drop.y + 18,
          alpha: 0,
          scaleY: 0.3,
          duration: 320 + Math.random() * 80,
          ease: 'Cubic.easeIn',
          onComplete: () => drop.destroy(),
        });
      }
    } else if (kind === 'seed') {
      const seed = this.scene.add.circle(x, y - 14, 3, 0xb8860b);
      this.scene.tweens.add({
        targets: seed,
        y: y + 6,
        scale: 0.3,
        alpha: 0,
        duration: 220,
        ease: 'Cubic.easeIn',
        onComplete: () => seed.destroy(),
      });
    } else if (kind === 'harvest') {
      // 收获星星粒子
      for (let i = 0; i < 6; i++) {
        const star = this.scene.add.circle(
          x + Phaser.Math.Between(-16, 16),
          y + Phaser.Math.Between(-10, 10),
          3,
          0xffd700
        );
        this.scene.tweens.add({
          targets: star,
          y: star.y - 30,
          x: star.x + Phaser.Math.Between(-14, 14),
          alpha: 0,
          duration: 500 + Math.random() * 200,
          ease: 'Cubic.easeOut',
          onComplete: () => star.destroy(),
        });
      }
    }
  }
}
