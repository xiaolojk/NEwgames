// GameScene · 渲染 + 输入 + HUD
import Phaser from 'phaser';
import { VIEW_W, VIEW_H, COLORS, MAP_W, MAP_H, BIOME, HARVEST } from '../config';
import {
  createGameState,
  tileSizePx,
  tileToWorld,
  resourceAt,
  setIntentWalk,
  setIntentHarvest,
  stepGame,
  type GameState,
  type Resource,
} from '../systems/GameState';

type ResourceSprite = {
  id: number;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
};

type DropSprite = {
  img: Phaser.GameObjects.Image;
  t: number;
  life: number;
  label: Phaser.GameObjects.Text;
};

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private playerSpr!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private tileLayer!: Phaser.GameObjects.Container;
  private resSprites: Map<number, ResourceSprite> = new Map();
  private drops: DropSprite[] = [];
  private clickMarker!: Phaser.GameObjects.Image;
  private leafEmit!: any;
  private rockEmit!: any;
  private woodEmit!: any;
  private sandEmit!: any;

  constructor() { super('Game'); }

  create() {
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.cameras.main.setBackgroundColor(COLORS.oceanDeep);
    this.cameras.main.setRoundPixels(false);

    this.state = createGameState();

    // 粒子（Phaser 3.90 新 API）
    this.leafEmit = this.add.particles(0, 0, 'pt_leaf', {
      lifespan: 600,
      speed: { min: 40, max: 140 },
      scale: { start: 0.6, end: 0 },
      emitting: false,
      angle: { min: 200, max: 340 },
      gravityY: 80,
    }).setDepth(50);
    this.rockEmit = this.add.particles(0, 0, 'pt_rock', {
      lifespan: 550,
      speed: { min: 50, max: 180 },
      scale: { start: 0.6, end: 0 },
      emitting: false,
      angle: { min: 0, max: 360 },
    }).setDepth(50);
    this.woodEmit = this.add.particles(0, 0, 'pt_wood', {
      lifespan: 550,
      speed: { min: 40, max: 140 },
      scale: { start: 0.55, end: 0 },
      emitting: false,
      angle: { min: 0, max: 360 },
    }).setDepth(50);
    this.sandEmit = this.add.particles(0, 0, 'pt_sand', {
      lifespan: 500,
      speed: { min: 30, max: 90 },
      scale: { start: 0.4, end: 0 },
      emitting: false,
      angle: { min: 200, max: 340 },
    }).setDepth(50);

    // 点击标记
    this.clickMarker = this.add.image(0, 0, 'spr_click').setDepth(30).setAlpha(0);

    this.renderTiles();
    this.renderResources();

    // 玩家阴影 + 人
    this.playerShadow = this.add.image(this.state.player.x, this.state.player.y + 12, '')
      .setAlpha(0.3).setDepth(9).setVisible(false);
    this.shadowGfx();
    this.playerSpr = this.add.image(this.state.player.x, this.state.player.y, 'spr_player').setDepth(20);

    // 输入：点击
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const wx = ptr.worldX;
      const wy = ptr.worldY;
      const r = resourceAt(this.state, wx, wy, 28);
      if (r) {
        setIntentHarvest(this.state, r);
      } else {
        setIntentWalk(this.state, wx, wy);
        // 踩沙触发沙粒子
        const pad = 60;
        const s = tileSizePx();
        const tx = Math.floor((wx - pad) / s);
        const ty = Math.floor((wy - pad) / s);
        if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H) {
          const z = this.state.zones[ty * MAP_W + tx];
          if (z >= 1 && z <= 2) {
            this.sandEmit.emitParticleAt(this.state.player.targetX, this.state.player.targetY + 10, 6);
          }
        }
      }
      // 显示点击标记
      this.tweens.killTweensOf(this.clickMarker);
      this.clickMarker.setPosition(this.state.player.targetX, this.state.player.targetY)
        .setScale(1.6).setAlpha(1);
      this.tweens.add({
        targets: this.clickMarker,
        scale: 0.8, alpha: 0, duration: 420,
        ease: 'Cubic.easeOut',
      });
    });

    this.initHud();
  }

  private shadowGfx() {
    // 用图形画个圆作为阴影贴图（只创建一次）
    let t: Phaser.Textures.CanvasTexture;
    if (this.textures.exists('shadow_player')) {
      t = this.textures.get('shadow_player') as Phaser.Textures.CanvasTexture;
    } else {
      t = this.textures.createCanvas('shadow_player', 64, 64) as Phaser.Textures.CanvasTexture;
    }
    const ctx = (t.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    const grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 26);
    grd.addColorStop(0, 'rgba(0,0,0,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);
    t.refresh();
    this.playerShadow.setTexture('shadow_player').setVisible(true).setScale(0.9);
  }

  // ============= 渲染瓦片/资源 =============
  private renderTiles() {
    if (this.tileLayer) this.tileLayer.destroy(true);
    this.tileLayer = this.add.container(0, 0).setDepth(0);
    const s = tileSizePx();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const idx = y * MAP_W + x;
        const b = this.state.tiles[idx];
        const wp = tileToWorld(x, y);
        let key = 'tile_water0';
        if (b === BIOME.SAND) key = 'tile_sand';
        else if (b === BIOME.GRASS) key = 'tile_grass';
        else key = (x + y) % 2 ? 'tile_water0' : 'tile_water1';
        const img = this.add.image(wp.x, wp.y, key).setOrigin(0.5);
        img.setDisplaySize(s * 1.04, s * 1.04);
        this.tileLayer.add(img);
      }
    }
    // 海岸线白沫：每水格邻 sand 就画一层椭圆
    const foamG = this.add.graphics().setDepth(2);
    foamG.lineStyle(0, 0, 0);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const idx = y * MAP_W + x;
        if (this.state.tiles[idx] !== BIOME.WATER) continue;
        let nearSand = false;
        for (let dy = -1; dy <= 1 && !nearSand; dy++) {
          for (let dx = -1; dx <= 1 && !nearSand; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
            if (this.state.tiles[ny * MAP_W + nx] !== BIOME.WATER) nearSand = true;
          }
        }
        if (nearSand) {
          const wp = tileToWorld(x, y);
          foamG.fillStyle(COLORS.foam, 0.85);
          foamG.fillEllipse(wp.x, wp.y, s * 1.1, s * 0.42);
        }
      }
    }
  }

  private renderResources() {
    for (const sp of this.resSprites.values()) {
      sp.body.destroy();
      sp.shadow.destroy();
    }
    this.resSprites.clear();
    for (const r of this.state.resources) {
      if (!r.alive) continue;
      const key = r.type === 'tree' ? 'spr_tree' : 'spr_rock';
      const s = tileSizePx() / 32; // 贴图按 32px 瓦片设计，缩放到实际
      const scale = r.type === 'tree' ? s * 1.15 : s * 1.0;
      // 阴影单独一个椭圆
      const shadow = this.add.image(r.x, r.y + (r.type === 'tree' ? 34 : 24) * s, '')
        .setDepth(10 + (r.y / VIEW_H) * 2)
        .setScale(scale * 1.3, scale * 0.35);
      // 复用 shadow_player 不合适，新建一张阴影贴图
      const shadowKey = 'shadow_res_' + r.type;
      if (!this.textures.exists(shadowKey)) {
        const t = this.textures.createCanvas(shadowKey, 64, 64);
        const ctx = (t!.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
        const grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
        grd.addColorStop(0, 'rgba(0,0,0,0.32)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, 64, 64);
        t!.refresh();
      }
      shadow.setTexture(shadowKey).setAlpha(0.9);
      const body = this.add.image(r.x, r.y, key).setScale(scale).setDepth(30);
      this.resSprites.set(r.id, { id: r.id, body, shadow });
    }
  }

  // ============= HUD 绑定 =============
  private invWood!: HTMLElement;
  private invStone!: HTMLElement;
  private cardWood!: HTMLElement;
  private cardStone!: HTMLElement;
  private progressWrap!: HTMLElement;
  private progressBar!: HTMLElement;
  private progressLabel!: HTMLElement;
  private toastLayer!: HTMLElement;

  private initHud() {
    this.invWood = document.getElementById('count-wood')!;
    this.invStone = document.getElementById('count-stone')!;
    this.cardWood = document.getElementById('inv-wood')!;
    this.cardStone = document.getElementById('inv-stone')!;
    this.progressWrap = document.getElementById('progress-wrap')!;
    this.progressBar = document.getElementById('progress-bar')!;
    this.progressLabel = document.getElementById('progress-label')!;
    this.toastLayer = document.getElementById('toast-layer')!;
    this.updateInv();
  }

  private updateInv() {
    this.invWood.textContent = String(this.state.inventory.wood);
    this.invStone.textContent = String(this.state.inventory.stone);
  }

  private bumpCard(kind: 'wood' | 'stone') {
    const el = kind === 'wood' ? this.cardWood : this.cardStone;
    el.classList.remove('bump');
    // 触发重排
    void (el as any).offsetWidth;
    el.classList.add('bump');
    window.setTimeout(() => el.classList.remove('bump'), 220);
  }

  private showProgress(pct: number, label: string) {
    this.progressWrap.classList.add('show');
    this.progressBar.style.width = Math.round(pct * 100) + '%';
    this.progressLabel.textContent = label + (pct > 0 ? '… ' + Math.round(pct * 100) + '%' : '…');
  }
  private clearProgress() {
    this.progressWrap.classList.remove('show');
    this.progressBar.style.width = '0%';
  }
  private toast(text: string) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    this.toastLayer.appendChild(d);
    window.setTimeout(() => d.remove(), 1800);
  }

  // ============= 掉落物（木头/石头从树上飘进背包动画）=============
  private spawnDrop(r: Resource, amount: number) {
    const kind = r.type === 'tree' ? 'wood' : 'stone';
    const key = kind === 'wood' ? 'drop_wood' : 'drop_stone';
    for (let i = 0; i < Math.min(amount, 3); i++) {
      const ox = (Math.random() - 0.5) * 18;
      const img = this.add.image(r.x + ox, r.y, key).setScale(1).setDepth(60);
      const label = this.add.text(r.x + ox, r.y - 20, '+' + (amount >= 3 ? (i === 0 ? amount : '') : (i === 0 ? amount : '')), {
        fontFamily: 'Fraunces, serif',
        fontSize: '16px',
        color: '#2b2733',
        fontStyle: 'bold',
      }).setOrigin(0.5, 1).setDepth(61);
      const startY = r.y - 10;
      const endY = r.y - 56;
      const startX = r.x + ox;
      const peakX = startX + (Math.random() - 0.5) * 30;
      // tween
      const tw = this.tweens.add({
        targets: [img, label],
        x: peakX,
        y: { from: startY, to: endY },
        scale: { from: 0.2, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 380,
        ease: 'Cubic.easeOut',
        yoyo: false,
        onComplete: () => {
          // 之后再 tween 到 HUD 位置
          const hudRect = (kind === 'wood' ? this.cardWood : this.cardStone).getBoundingClientRect();
          const gameRect = this.game.canvas.getBoundingClientRect();
          const tx = hudRect.left + hudRect.width / 2 - gameRect.left;
          const ty = hudRect.top + hudRect.height / 2 - gameRect.top;
          const dur = 420;
          this.tweens.add({
            targets: [img, label],
            x: tx, y: ty,
            scale: 0.35,
            alpha: 0.2,
            duration: dur,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              img.destroy(); label.destroy();
              this.bumpCard(kind);
              this.updateInv();
            },
          });
          void tw;
        },
      });
    }
  }

  // ============= 主循环 =============
  update(_t: number, dtMs: number) {
    const dt = Math.min(0.033, dtMs / 1000);

    stepGame(this.state, dt, {
      onHarvestTick: (pct, label) => this.showProgress(pct, label),
      onHarvestEnd: (r, amt) => {
        // 粒子/抖动在 onResourceDestroyed
        const verb = r.type === 'tree' ? '砍树' : '挖石';
        const got = r.type === 'tree' ? `🪵 ×${amt}` : `🪨 ×${amt}`;
        this.toast(`${verb}完成：${got}`);
        this.spawnDrop(r, amt);
      },
      onResourceDestroyed: (r) => {
        const sp = this.resSprites.get(r.id);
        if (sp) {
          if (r.type === 'tree') {
            this.leafEmit.emitParticleAt(r.x, r.y - 10, 26);
            this.woodEmit.emitParticleAt(r.x, r.y, 10);
            this.cameras.main.shake(180, 0.004);
          } else {
            this.rockEmit.emitParticleAt(r.x, r.y, 22);
            this.cameras.main.shake(140, 0.006);
          }
          // 倒下动画
          this.tweens.add({
            targets: sp.body,
            scaleX: sp.body.scaleX * 1.1,
            scaleY: 0.0,
            alpha: 0.0,
            y: sp.body.y + 10,
            duration: 260,
            ease: 'Back.easeIn',
            onComplete: () => {
              sp.body.destroy(); sp.shadow.destroy();
              this.resSprites.delete(r.id);
            },
          });
          this.tweens.add({ targets: sp.shadow, alpha: 0, duration: 260 });
        }
      },
      clearProgress: () => this.clearProgress(),
    });

    this.syncPlayer();
    this.syncResources();
  }

  private syncPlayer() {
    const p = this.state.player;
    // 走路轻微上下浮动
    const bob = p.moving ? Math.sin(p.walkT) * 2 : 0;
    this.playerSpr.setPosition(p.x, p.y + bob);
    // 走路帧：左右倾斜
    const tilt = p.moving ? Math.sin(p.walkT) * 0.04 : 0;
    this.playerSpr.setRotation(tilt);
    this.playerShadow.setPosition(p.x, p.y + 12);
  }

  private syncResources() {
    for (const r of this.state.resources) {
      if (!r.alive) continue;
      const sp = this.resSprites.get(r.id);
      if (!sp) continue;
      const shakeX = r.shake > 0 ? (Math.random() - 0.5) * r.shake * 6 : 0;
      const shakeY = r.shake > 0 ? (Math.random() - 0.5) * r.shake * 4 : 0;
      sp.body.setPosition(r.x + shakeX, r.y + shakeY);
      // 深度按 y 排序（伪前后遮挡）
      const d = 30 + (r.y / VIEW_H) * 20;
      sp.body.setDepth(d);
      sp.shadow.setPosition(r.x, sp.shadow.y).setDepth(d - 12);
    }
    // 玩家深度也要随 y
    this.playerSpr.setDepth(30 + (this.state.player.y / VIEW_H) * 20 + 0.5);
    this.playerShadow.setDepth(this.playerSpr.depth - 12);
  }
}
