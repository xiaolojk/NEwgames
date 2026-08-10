// GameScene · 主游戏场景 · 橘子地牢
// 渲染地牢、玩家、敌人、道具、特效；处理输入、AI、战斗、楼层递进
// Orgc 橘子工作室

import Phaser from 'phaser';
import { GameState } from '../systems/GameState';
import { HUD } from '../render/HUD';
import {
  TILE, SCALE, TILE_PIX, VIEW_W, VIEW_H, MAP_W, MAP_H,
  TILE_TYPE, COLORS, PLAYER_BASE, ENEMY_TYPES, ITEMS,
} from '../config';
import type { EnemyState, ItemDrop, DungeonState, PlayerState } from '../types';
import { isWalkable, tileAt, circleCollides } from '../systems/DungeonGenerator';
import { TouchInput } from '../render/TouchInput';

// 商人 NPC 精灵
interface ShopkeeperSprite {
  sprite: Phaser.GameObjects.Text;
  hint: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

interface EnemySprite {
  body: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  enemy: EnemyState;
}

interface ItemSprite {
  sprite: Phaser.GameObjects.Sprite;
  item: ItemDrop;
  bob: number;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private hud!: HUD;
  private tileLayer!: Phaser.GameObjects.Container;
  private enemySprites: EnemySprite[] = [];
  private itemSprites: ItemSprite[] = [];
  private shopkeepers: ShopkeeperSprite[] = [];
  private playerSprite!: Phaser.GameObjects.Sprite;
  private weaponSprite!: Phaser.GameObjects.Sprite;
  private slashFx!: Phaser.GameObjects.Sprite;
  private fogLayer!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cooldownMul = 1.0;
  private playerHurtFlash: Phaser.GameObjects.Rectangle | null = null;
  private damageTexts: Array<{ text: Phaser.GameObjects.Text; life: number; vy: number }> = [];
  private bloodParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private isTransitioning = false;
  private touchInput!: TouchInput;
  // 打击爽感：命中停顿（hit-stop）让重击有冲击力
  private hitStopUntil = 0;
  // 武器拖尾点
  private weaponTrail: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('Game');
  }

  shutdown() {
    window.removeEventListener('orgc-quick-potion', this.onQuickPotion);
    window.removeEventListener('orgc-open-shop', this.onOpenShop);
  }

  create() {
    // 创建游戏状态：自动从 localStorage 加载存档（若有）
    this.state = new GameState(true);
    this.cooldownMul = 1.0;
    this.hud = new HUD(this.state);
    this.hud.setCooldownMul(this.cooldownMul);

    // 设置相机
    this.cameras.main.setBackgroundColor(COLORS.uiBg);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(this.playerSprite || this.add.container(0, 0), true, 0.15, 0.15);

    // 渲染地牢
    this.renderDungeon();

    // 创建玩家精灵
    this.playerSprite = this.add.sprite(this.state.player.x, this.state.player.y, 'player', 0);
    this.playerSprite.setScale(SCALE);
    this.playerSprite.setOrigin(0.5, 0.6);
    // 武器精灵（剑）
    this.weaponSprite = this.add.sprite(this.state.player.x, this.state.player.y, 'item_sword');
    this.weaponSprite.setScale(SCALE);
    this.weaponSprite.setOrigin(0.1, 0.5);
    this.weaponSprite.setVisible(false);

    // 攻击特效
    this.slashFx = this.add.sprite(0, 0, 'fx_slash');
    this.slashFx.setScale(SCALE);
    this.slashFx.setVisible(false);
    this.slashFx.setDepth(50);

    // 创建敌人精灵
    this.refreshEnemySprites();
    this.refreshItemSprites();
    // 创建商人 NPC
    this.refreshShopkeepers();

    // 雾气遮罩（视野限制）
    this.fogLayer = this.add.image(this.state.player.x, this.state.player.y, 'fog');
    this.fogLayer.setDisplaySize(VIEW_W * 1.5, VIEW_H * 1.5);
    this.fogLayer.setDepth(40);
    this.fogLayer.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // 玩家受伤红色闪烁覆盖
    this.playerHurtFlash = this.add.rectangle(
      VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0xff0000, 0,
    );
    this.playerHurtFlash.setScrollFactor(0);
    this.playerHurtFlash.setDepth(60);

    // 相机跟随玩家
    this.cameras.main.startFollow(this.playerSprite, true, 0.2, 0.2);

    // 输入
    this.setupInput();

    // 触屏输入
    this.touchInput = new TouchInput();
    // 快速药水按钮事件
    window.addEventListener('orgc-quick-potion', this.onQuickPotion);
    // 触屏商店按钮事件
    window.addEventListener('orgc-open-shop', this.onOpenShop);

    // 进入提示
    this.hud.showToast(`第 ${this.state.dungeon.floor} 层 · 探索地牢`, 2000);

    console.log('[Orgc] 游戏启动完成 · 触屏=' + (this.touchInput.isEnabled() ? 'ON' : 'OFF'));
  }

  // 快速使用第一个药水
  private onQuickPotion = () => {
    // 找到第一个药水槽
    for (let i = 0; i < this.state.inventory.length; i++) {
      const slot = this.state.inventory[i];
      const cfg = ITEMS[slot.itemId];
      if (cfg && cfg.type === 'potion') {
        if (this.hud.useSlot(i)) {
          this.hud.showToast(`使用了 ${cfg.name}`);
        }
        return;
      }
    }
    this.hud.showToast('背包没有药水');
  };

  // 触屏打开商店
  private onOpenShop = () => {
    this.openShopIfNear();
  };

  // ============ 渲染地牢瓦片 ============
  private renderDungeon() {
    if (this.tileLayer) this.tileLayer.destroy(true);
    this.tileLayer = this.add.container(0, 0);
    const d = this.state.dungeon;
    // 用 Tilemap 太复杂，直接用 Image 数组（性能足够）
    // 优化：只为可见瓦片创建精灵
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = d.tiles[y * MAP_W + x];
        if (t === TILE_TYPE.WALL) continue;  // 墙用背景色
        let key = 'tile_floor_0';
        if (t === TILE_TYPE.FLOOR) key = `tile_floor_${(x + y) % 4}`;
        else if (t === TILE_TYPE.DOOR) key = 'tile_door';
        else if (t === TILE_TYPE.STAIRS_DOWN) key = 'tile_stairs';
        else if (t === TILE_TYPE.CHEST) key = 'tile_chest';
        const sp = this.add.image(x * TILE_PIX + TILE_PIX / 2, y * TILE_PIX + TILE_PIX / 2, key);
        sp.setOrigin(0.5);
        sp.setScale(SCALE);
        this.tileLayer.add(sp);
      }
    }
    // 绘制墙壁（在地板周围）
    this.renderWalls();
    this.tileLayer.setDepth(0);
  }

  private renderWalls() {
    const d = this.state.dungeon;
    const g = this.add.graphics();
    g.fillStyle(COLORS.wallDark, 1);
    // 墙壁：在墙瓦片处画一个 32x32 方块
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = d.tiles[y * MAP_W + x];
        if (t === TILE_TYPE.WALL) {
          // 检查是否相邻有非墙（暴露的墙才画，节省性能）
          let exposed = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
              if (d.tiles[ny * MAP_W + nx] !== TILE_TYPE.WALL) {
                exposed = true; break;
              }
            }
            if (exposed) break;
          }
          if (exposed) {
            g.fillRect(x * TILE_PIX, y * TILE_PIX, TILE_PIX, TILE_PIX);
          }
        }
      }
    }
    // 顶部高光
    g.fillStyle(COLORS.wallLight, 1);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = d.tiles[y * MAP_W + x];
        if (t === TILE_TYPE.WALL) {
          // 上面是地板 → 画顶部高光
          if (y + 1 < MAP_H && d.tiles[(y + 1) * MAP_W + x] !== TILE_TYPE.WALL) {
            g.fillRect(x * TILE_PIX, y * TILE_PIX + TILE_PIX - 4, TILE_PIX, 4);
          }
        }
      }
    }
    this.tileLayer.add(g);
  }

  // ============ 敌人/道具精灵刷新 ============
  private refreshEnemySprites() {
    for (const es of this.enemySprites) {
      es.body.destroy();
      es.hpBar.destroy();
      es.hpBarBg.destroy();
    }
    this.enemySprites = [];
    for (const e of this.state.dungeon.enemies) {
      if (!e.alive) continue;
      const cfg = ENEMY_TYPES[e.type];
      const texKey = e.type === 'boss1' ? 'boss' : e.type;
      const sizeMul = cfg.isBoss ? SCALE * 2 : SCALE;
      const body = this.add.sprite(e.x, e.y, texKey, 0);
      body.setScale(sizeMul);
      body.setOrigin(0.5, 0.6);
      body.setDepth(10);
      // 血条
      const barW = cfg.isBoss ? 60 : 24;
      const barH = cfg.isBoss ? 5 : 3;
      const hpBarBg = this.add.rectangle(e.x, e.y - (cfg.isBoss ? 30 : 16), barW + 2, barH + 2, 0x000000, 0.7);
      hpBarBg.setDepth(11);
      const hpBar = this.add.rectangle(e.x - barW / 2, e.y - (cfg.isBoss ? 30 : 16), barW, barH, 0xc02030);
      hpBar.setOrigin(0, 0.5);
      hpBar.setDepth(12);
      this.enemySprites.push({ body, hpBar, hpBarBg, enemy: e });
    }
  }

  private refreshItemSprites() {
    for (const is of this.itemSprites) is.sprite.destroy();
    this.itemSprites = [];
    for (const item of this.state.dungeon.items) {
      const cfg = ITEMS[item.itemId];
      if (!cfg) continue;
      let texKey = `item_${item.itemId}`;
      // 材质/钥匙没有独立纹理，统一用 emoji 文本
      let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
      if (this.textures.exists(texKey)) {
        sprite = this.add.sprite(item.x, item.y, texKey);
        (sprite as Phaser.GameObjects.Sprite).setScale(SCALE);
      } else {
        // 用 emoji
        sprite = this.add.text(item.x, item.y, cfg.icon, {
          fontSize: '20px',
        }).setOrigin(0.5);
      }
      sprite.setDepth(5);
      this.itemSprites.push({
        sprite: sprite as Phaser.GameObjects.Sprite,
        item,
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  // ============ 商人 NPC 精灵 ============
  private refreshShopkeepers() {
    for (const sk of this.shopkeepers) {
      sk.sprite.destroy();
      sk.hint.destroy();
    }
    this.shopkeepers = [];
    for (const shop of this.state.dungeon.shops) {
      const px = shop.x * TILE_PIX + TILE_PIX / 2;
      const py = shop.y * TILE_PIX + TILE_PIX / 2;
      // 商人本体（用 emoji 文本表示）
      const sprite = this.add.text(px, py, '🧙', {
        fontSize: '28px',
      }).setOrigin(0.5);
      sprite.setDepth(12);
      // 浮动提示
      const hint = this.add.text(px, py - 28, '🛒 商人', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#ffe080',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      hint.setDepth(13);
      // 轻微浮动动画
      this.tweens.add({
        targets: sprite,
        y: py - 4,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.shopkeepers.push({ sprite, hint, x: px, y: py });
    }
  }

  // ============ 输入 ============
  private setupInput() {
    if (!this.input.keyboard) return;
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,RIGHT,DOWN,SPACE,SHIFT,ONE,TWO,THREE,FOUR,FIVE') as any;
    // 鼠标点击：先检查是否点中商人，否则攻击
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 优先检测商人
      for (const sk of this.shopkeepers) {
        const dx = sk.x - pointer.worldX;
        const dy = sk.y - pointer.worldY;
        if (dx * dx + dy * dy < 24 * 24) {
          this.openShopIfNear();
          return;
        }
      }
      this.tryAttack(pointer.worldX, pointer.worldY);
    });
    // E 键打开商店
    this.input.keyboard?.on('keydown-E', () => {
      this.openShopIfNear();
    });
    // 数字键使用道具
    const useFn = (idx: number) => () => {
      if (this.hud.useSlot(idx)) {
        const slot = this.state.inventory[idx];
        if (slot) this.hud.showToast(`使用了 ${ITEMS[slot.itemId].name}`);
      }
    };
    this.input.keyboard?.on('keydown-ONE', useFn(0));
    this.input.keyboard?.on('keydown-TWO', useFn(1));
    this.input.keyboard?.on('keydown-THREE', useFn(2));
    this.input.keyboard?.on('keydown-FOUR', useFn(3));
    this.input.keyboard?.on('keydown-FIVE', useFn(4));
  }

  // 检查靠近商人则打开商店
  private openShopIfNear() {
    if (this.hud.isShopOpen()) return;
    const p = this.state.player;
    for (const sk of this.shopkeepers) {
      const dx = sk.x - p.x;
      const dy = sk.y - p.y;
      if (dx * dx + dy * dy < 48 * 48) {
        this.hud.openShop();
        return;
      }
    }
    this.hud.showToast('需要靠近商人才能交易');
  }

  // ============ 攻击 ============
  private tryAttack(targetX?: number, targetY?: number) {
    const p = this.state.player;
    if (p.attackCooldown > 0 || p.dashTime > 0) return;
    p.attackCooldown = PLAYER_BASE.attackCooldown * this.cooldownMul;
    p.attacking = true;
    p.attackTime = 0.18;
    // 攻击方向
    let angle: number;
    if (targetX !== undefined && targetY !== undefined) {
      angle = Math.atan2(targetY - p.y, targetX - p.x);
    } else {
      // 用 facing
      const dirs = [
        { x: 0, y: 1 },   // DOWN
        { x: -1, y: 0 },  // LEFT
        { x: 1, y: 0 },   // RIGHT
        { x: 0, y: -1 },  // UP
      ];
      const d = dirs[p.facing];
      angle = Math.atan2(d.y, d.x);
    }
    p.attackAngle = angle;
    // 显示挥砍特效：放大旋转冲击感
    this.slashFx.setPosition(p.x + Math.cos(angle) * 18, p.y + Math.sin(angle) * 18);
    this.slashFx.setRotation(angle);
    this.slashFx.setVisible(true);
    this.slashFx.alpha = 1;
    this.slashFx.setScale(SCALE * 0.6);
    this.tweens.add({
      targets: this.slashFx,
      alpha: 0,
      scale: SCALE * 1.4,
      duration: 200,
      ease: 'Quad.out',
      onComplete: () => this.slashFx.setVisible(false),
    });
    // 武器精灵挥砍动画：从 -60° 摆到 +60°（约 120° 弧线）
    this.weaponSprite.setVisible(true);
    this.weaponSprite.setPosition(p.x, p.y);
    this.weaponSprite.setOrigin(0.1, 0.5);
    this.weaponSprite.setRotation(angle - 1.0);
    this.weaponSprite.setScale(SCALE);
    this.weaponSprite.alpha = 1;
    this.tweens.add({
      targets: this.weaponSprite,
      rotation: angle + 1.0,
      duration: 180,
      ease: 'Quad.out',
      onComplete: () => {
        this.weaponSprite.setVisible(false);
      },
    });
    // 武器拖尾：在挥砍路径上画弧线
    this.spawnWeaponTrail(p.x, p.y, angle);
    // 检测命中
    this.checkAttackHits(angle);
  }

  // 武器拖尾：绘制挥砍弧线，淡出
  private spawnWeaponTrail(cx: number, cy: number, angle: number) {
    const g = this.add.graphics();
    g.setDepth(45);
    const arc = PLAYER_BASE.attackArc;
    const r1 = 16;
    const r2 = PLAYER_BASE.attackRange + 6;
    // 用三角扇形画半透明拖尾
    g.fillStyle(0xfff0c0, 0.4);
    g.beginPath();
    g.moveTo(cx, cy);
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const a = angle - arc / 2 + (arc * i / steps);
      g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    g.lineTo(cx, cy);
    g.closePath();
    g.fillPath();
    // 内圈亮白
    g.fillStyle(0xffffff, 0.5);
    g.beginPath();
    g.moveTo(cx, cy);
    for (let i = 0; i <= steps; i++) {
      const a = angle - arc / 2 + (arc * i / steps);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    }
    g.closePath();
    g.fillPath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 220,
      ease: 'Quad.out',
      onComplete: () => g.destroy(),
    });
  }

  private checkAttackHits(angle: number) {
    const p = this.state.player;
    const range = PLAYER_BASE.attackRange;
    const arc = PLAYER_BASE.attackArc;
    let hitAny = false;
    let hitCrit = false;
    let hitKilled = false;
    for (const e of this.state.dungeon.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range + 8) continue;
      const eAngle = Math.atan2(dy, dx);
      let diff = Math.abs(eAngle - angle);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff > arc / 2) continue;
      // 命中
      const crit = Math.random() < 0.18;
      const dmgMul = crit ? 2.2 : 1.0;
      const dmg = Math.floor((p.attack + Math.floor(Math.random() * 4)) * dmgMul);
      // 击退：暴击 1.8 倍，普通 1.0 倍
      const knockForce = crit ? 360 : 220;
      const knockX = Math.cos(angle) * knockForce;
      const knockY = Math.sin(angle) * knockForce;
      const killed = this.state.damageEnemy(e, dmg, knockX, knockY);
      hitAny = true;
      if (crit) hitCrit = true;
      if (killed) hitKilled = true;
      // 伤害飘字：暴击大号金色 + 普通白色
      this.showDamageText(e.x, e.y - 12, String(dmg) + (crit ? '!' : ''),
        crit ? '#ffe040' : '#ffffff', crit);
      // 命中粒子：火花 + 血溅
      this.spawnHitSparks(e.x, e.y, angle, crit);
      this.spawnBlood(e.x, e.y);
      if (killed) {
        this.hud.showToast(`击败 ${ENEMY_TYPES[e.type].name}！`);
        // 击杀爆炸粒子
        this.spawnDeathBurst(e.x, e.y, ENEMY_TYPES[e.type].color);
        // 掉落道具概率
        if (Math.random() < 0.35) {
          const drops = ['potion_hp', 'potion_sp', 'wood', 'iron'];
          const drop = drops[Math.floor(Math.random() * drops.length)];
          this.state.dungeon.items.push({
            id: Date.now() + Math.random(),
            itemId: drop,
            x: e.x, y: e.y,
            count: 1,
            vy: 0,
            pickupDelay: 0.5,
          });
          this.refreshItemSprites();
        }
        // Boss 击败
        const cfg = ENEMY_TYPES[e.type];
        if (cfg.isBoss) {
          this.hud.showToast('击败 Boss！楼梯已开启', 2500);
        }
      }
    }
    // === 打击爽感反馈 ===
    if (hitAny) {
      // 命中停顿：暴击 90ms / 普通 45ms / 击杀 120ms
      const stopMs = hitKilled ? 120 : (hitCrit ? 90 : 45);
      this.hitStopUntil = this.time.now + stopMs;
      // 屏幕震动：暴击更强
      const shakeDur = hitCrit ? 180 : 90;
      const shakeIntensity = hitCrit ? 0.018 : 0.008;
      this.cameras.main.shake(shakeDur, shakeIntensity);
      // 击杀时白光闪屏
      if (hitKilled) this.flashScreen(0xffffff, 0.25, 120);
      else if (hitCrit) this.flashScreen(0xffe040, 0.12, 80);
    }
  }

  // 屏幕闪光（击杀/暴击反馈）
  private flashScreen(color: number, alpha: number, duration: number) {
    if (!this.playerHurtFlash) return;
    const flash = this.add.rectangle(
      VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, color, alpha,
    );
    flash.setScrollFactor(0);
    flash.setDepth(70);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  }

  // 命中火花粒子（暴击带星形迸射）
  private spawnHitSparks(x: number, y: number, angle: number, crit: boolean) {
    const count = crit ? 10 : 6;
    for (let i = 0; i < count; i++) {
      const spread = crit ? Math.PI * 1.4 : Math.PI * 0.8;
      const a = angle + (Math.random() - 0.5) * spread;
      const speed = crit ? 90 + Math.random() * 80 : 50 + Math.random() * 60;
      const spark = this.add.image(x, y, 'fx_blood');
      spark.setScale(crit ? 0.7 + Math.random() * 0.5 : 0.4 + Math.random() * 0.3);
      spark.setDepth(20);
      spark.setTint(crit ? 0xffe040 : 0xfff0a0);  // 火花金黄
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * speed,
        y: y + Math.sin(a) * speed,
        alpha: 0,
        scale: 0,
        duration: crit ? 380 : 280,
        ease: 'Quad.out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  // 击杀爆炸粒子环
  private spawnDeathBurst(x: number, y: number, color: number) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 70 + Math.random() * 90;
      const p = this.add.image(x, y, 'fx_blood');
      p.setScale(0.6 + Math.random() * 0.8);
      p.setDepth(15);
      p.setTint(color);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * speed,
        y: y + Math.sin(a) * speed,
        alpha: 0,
        duration: 500 + Math.random() * 200,
        ease: 'Quad.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ============ 伤害飘字 ============
  private showDamageText(x: number, y: number, text: string, color: string, crit = false) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: crit ? '22px' : '14px',
      color,
      stroke: '#000000',
      strokeThickness: crit ? 5 : 3,
    }).setOrigin(0.5).setDepth(100);
    // 暴击字弹出动画
    if (crit) {
      t.setScale(0.4);
      this.tweens.add({
        targets: t,
        scale: 1.2,
        duration: 100,
        yoyo: true,
        ease: 'Back.out',
      });
    }
    this.damageTexts.push({ text: t, life: crit ? 1.0 : 0.8, vy: crit ? -55 : -40 });
  }

  // ============ 血迹粒子 ============
  private spawnBlood(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const p = this.add.image(x, y, 'fx_blood');
      p.setScale(0.5 + Math.random());
      p.setDepth(8);
      p.setTint(0xff2030);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    }
  }

  // ============ 主更新循环 ============
  update(time: number, delta: number) {
    if (this.state.gameOver) {
      this.hud.showDeath();
      return;
    }
    if (this.state.pendingUpgrade) {
      this.hud.update();
      return;  // 升级时暂停
    }
    if (this.hud.isShopOpen()) {
      this.hud.update();
      return;  // 商店打开时暂停游戏
    }
    // 命中停顿（hit-stop）：重击时短暂冻结整个世界，强化打击感
    // 期间只更新视觉特效（伤害飘字、相机震动），冻结玩家/敌人/AI
    const inHitStop = time < this.hitStopUntil;
    const dt = inHitStop ? 0 : Math.min(delta / 1000, 0.05);
    if (!inHitStop) {
      this.updatePlayer(dt);
      this.updateEnemies(dt, time);
      this.updateItems(dt);
      this.updateProjectiles(dt);
    }
    this.updateSprites();
    this.updateDamageTexts(dt > 0 ? dt : 0.016);  // 飘字继续动
    if (!inHitStop) {
      this.checkInteractions();
      this.checkShopNearby();
      this.state.autoSave(time);  // 自动存档
    }
    // 相机跟随玩家
    this.cameras.main.centerOn(this.state.player.x, this.state.player.y);
    // 雾气跟随
    this.fogLayer.setPosition(this.state.player.x, this.state.player.y);
    // 受伤闪烁
    if (this.state.player.hurtFlash > 0) {
      this.playerHurtFlash?.setAlpha(this.state.player.hurtFlash * 0.4);
    } else {
      this.playerHurtFlash?.setAlpha(0);
    }
    this.hud.update();
  }

  // ============ 商店交互检测 ============
  private shopPromptShown = false;
  private checkShopNearby() {
    const p = this.state.player;
    let near = false;
    for (const sk of this.shopkeepers) {
      const dx = sk.x - p.x;
      const dy = sk.y - p.y;
      if (dx * dx + dy * dy < 40 * 40) {
        near = true;
        break;
      }
    }
    if (near && !this.shopPromptShown) {
      this.hud.showToast('按 E 或点击商人交易', 1200);
      this.shopPromptShown = true;
    } else if (!near && this.shopPromptShown) {
      this.shopPromptShown = false;
    }
  }

  // ============ 玩家更新 ============
  private updatePlayer(dt: number) {
    const p = this.state.player;
    // 冷却递减
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.attackTime = Math.max(0, p.attackTime - dt);
    if (p.attackTime <= 0) p.attacking = false;
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    // 体力恢复
    p.sp = Math.min(p.maxSp, p.sp + 12 * dt);

    // 输入移动（键盘）
    let mx = 0, my = 0;
    if (this.keys.W?.isDown || this.keys.UP?.isDown) my -= 1;
    if (this.keys.S?.isDown || this.keys.DOWN?.isDown) my += 1;
    if (this.keys.A?.isDown || this.keys.LEFT?.isDown) mx -= 1;
    if (this.keys.D?.isDown || this.keys.RIGHT?.isDown) mx += 1;
    // 触屏摇杆输入（与键盘合并，触屏优先）
    if (this.touchInput && this.touchInput.isEnabled()) {
      const tmx = this.touchInput.moveX;
      const tmy = this.touchInput.moveY;
      if (tmx !== 0 || tmy !== 0) {
        mx = tmx;
        my = tmy;
      }
    }
    // 归一化（键盘对角线）
    if (mx !== 0 && my !== 0 && Math.abs(mx) === 1 && Math.abs(my) === 1) {
      const inv = 1 / Math.sqrt(2);
      mx *= inv; my *= inv;
    }
    // 朝向
    if (Math.abs(mx) > Math.abs(my)) {
      p.facing = mx > 0 ? 2 : 1;  // RIGHT / LEFT
    } else if (my !== 0) {
      p.facing = my > 0 ? 0 : 3;  // DOWN / UP
    }
    // 触屏：当无摇杆输入时，按 facing 方向作为攻击方向兜底
    if (this.touchInput && this.touchInput.isEnabled()) {
      if (mx === 0 && my === 0) {
        const dirs = [
          { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 },
        ];
        const fd = dirs[p.facing];
        this.touchInput.setAttackDir(fd.x, fd.y);
      }
    }
    // 触屏攻击按钮
    if (this.touchInput && this.touchInput.isEnabled() && this.touchInput.consumeAttack()) {
      const dx = this.touchInput.attackDirX;
      const dy = this.touchInput.attackDirY;
      const targetX = p.x + dx * 50;
      const targetY = p.y + dy * 50;
      this.tryAttack(targetX, targetY);
    }
    // 冲刺
    const dashHeld = (this.keys.SHIFT?.isDown) || (this.touchInput && this.touchInput.isDashHeld());
    if (dashHeld && p.sp >= PLAYER_BASE.dashCost && p.dashTime <= 0 && (mx !== 0 || my !== 0)) {
      p.dashTime = PLAYER_BASE.dashDuration;
      p.dashDir = { x: mx, y: my };
      p.sp -= PLAYER_BASE.dashCost;
      p.invuln = Math.max(p.invuln, PLAYER_BASE.dashDuration + 0.05);
    }
    let speed = p.speed;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      mx = p.dashDir.x;
      my = p.dashDir.y;
      speed = PLAYER_BASE.dashSpeed;
      // 冲刺残影
      if (Math.random() < 0.6) {
        const ghost = this.add.sprite(p.x, p.y, 'player', p.facing * 4 + Math.floor(p.walkFrame));
        ghost.setScale(SCALE);
        ghost.setOrigin(0.5, 0.6);
        ghost.setAlpha(0.4);
        ghost.setTint(0x80c0ff);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 200,
          onComplete: () => ghost.destroy(),
        });
      }
    }
    // 应用速度
    p.vx = mx * speed;
    p.vy = my * speed;
    // 圆形碰撞移动（分轴检测，防穿墙）
    const PR = 6;  // 玩家碰撞半径
    const newX = p.x + p.vx * dt;
    if (!circleCollides(this.state.dungeon, newX, p.y, PR)) {
      p.x = newX;
    }
    const newY = p.y + p.vy * dt;
    if (!circleCollides(this.state.dungeon, p.x, newY, PR)) {
      p.y = newY;
    }
    // 行走动画：60fps 帧率切换（每 0.05s 切一帧，4 帧循环 → 20fps 显示帧率，体感流畅）
    if (mx !== 0 || my !== 0) {
      p.walkTime += dt;
      if (p.walkTime > 0.05) {  // 60fps 动画速率（4 帧循环）
        p.walkTime = 0;
        p.walkFrame = (p.walkFrame + 1) % 4;
      }
    } else {
      p.walkFrame = 0;
      p.walkTime = 0;
    }
  }

  // ============ 敌人 AI ============
  private updateEnemies(dt: number, time: number) {
    const p = this.state.player;
    const d = this.state.dungeon;
    for (const e of d.enemies) {
      if (!e.alive) continue;
      const cfg = ENEMY_TYPES[e.type];
      // 受伤闪烁递减
      e.hurtFlash = Math.max(0, e.hurtFlash - dt);
      // 动画时间累计（90fps 平滑动画：每 0.11s 切一帧，2 帧循环 → 视觉上 9fps 显示帧率，
      // 但配合缩放呼吸 + Y 轴浮动让动作连续不卡顿）
      e.animTime += dt;
      if (e.animTime > 0.11) {
        e.animTime = 0;
        e.animFrame = (e.animFrame + 1) % 2;
      }
      // 击退递减
      if (e.knockback.t > 0) {
        e.knockback.t -= dt;
        const kx = e.knockback.x * dt;
        const ky = e.knockback.y * dt;
        if (!circleCollides(d, e.x + kx, e.y, 5)) e.x += kx;
        if (!circleCollides(d, e.x, e.y + ky, 5)) e.y += ky;
        e.knockback.x *= 0.85;
        e.knockback.y *= 0.85;
        continue;
      }
      // 距离玩家
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // AI 状态切换
      if (dist < cfg.detectRange) {
        if (dist < cfg.attackRange) {
          e.ai = 'attack';
        } else {
          e.ai = 'chase';
        }
      } else {
        e.ai = 'wander';
      }
      let mvx = 0, mvy = 0;
      if (e.ai === 'chase') {
        // 朝玩家移动
        if (dist > 0.1) {
          mvx = dx / dist;
          mvy = dy / dist;
        }
        // 朝向
        if (Math.abs(mvx) > Math.abs(mvy)) e.facing = mvx > 0 ? 2 : 1;
        else e.facing = mvy > 0 ? 0 : 3;
      } else if (e.ai === 'attack') {
        // 攻击玩家
        if (time - e.lastAttack > cfg.attackCooldown * 1000) {
          e.lastAttack = time;
          const knockX = mvx * 100;
          const knockY = mvy * 100;
          const dmg = cfg.attack + Math.floor(Math.random() * 3);
          this.state.damagePlayer(dmg, dx / dist * 150, dy / dist * 150);
          this.showDamageText(p.x, p.y - 16, String(dmg), '#ff4040');
          this.cameras.main.shake(80, 0.005);
        }
      } else if (e.ai === 'wander') {
        // 随机游荡
        if (time > e.wanderUntil || !e.wanderTarget) {
          e.wanderTarget = {
            x: e.x + (Math.random() - 0.5) * 80,
            y: e.y + (Math.random() - 0.5) * 80,
          };
          e.wanderUntil = time + 2000 + Math.random() * 2000;
        }
        const wdx = e.wanderTarget.x - e.x;
        const wdy = e.wanderTarget.y - e.y;
        const wd = Math.sqrt(wdx * wdx + wdy * wdy);
        if (wd > 4) {
          mvx = wdx / wd * 0.4;
          mvy = wdy / wd * 0.4;
        }
      }
      // 应用速度
      const sp = e.speed * (e.ai === 'wander' ? 0.4 : 1.0);
      e.vx = mvx * sp;
      e.vy = mvy * sp;
      // 圆形碰撞移动（防穿墙）
      const ER = 5;  // 敌人碰撞半径
      const newX = e.x + e.vx * dt;
      if (!circleCollides(d, newX, e.y, ER)) {
        e.x = newX;
      }
      const newY = e.y + e.vy * dt;
      if (!circleCollides(d, e.x, newY, ER)) {
        e.y = newY;
      }
    }
    // 清理死亡敌人
    const before = d.enemies.length;
    d.enemies = d.enemies.filter(e => e.alive);
    if (d.enemies.length !== before) {
      this.refreshEnemySprites();
    }
  }

  // ============ 道具更新 ============
  private updateItems(dt: number) {
    const p = this.state.player;
    const d = this.state.dungeon;
    for (const it of d.items) {
      if (it.pickupDelay > 0) {
        it.pickupDelay -= dt;
        continue;
      }
      // 距离玩家
      const dx = p.x - it.x;
      const dy = p.y - it.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 14) {
        // 拾取
        if (this.state.addItem(it.itemId, it.count)) {
          const cfg = ITEMS[it.itemId];
          this.hud.showToast(`获得 ${cfg.name} ×${it.count}`);
          (it as any).picked = true;
        }
      } else if (dist < 50) {
        // 吸附
        it.x += dx / dist * 80 * dt;
        it.y += dy / dist * 80 * dt;
      }
    }
    const before = d.items.length;
    d.items = d.items.filter(it => !(it as any).picked);
    if (d.items.length !== before) {
      this.refreshItemSprites();
    }
  }

  private updateProjectiles(dt: number) {
    // 暂无投射物（武器为近战）
    void dt;
  }

  // ============ 精灵同步 ============
  private updateSprites() {
    const p = this.state.player;
    // 玩家
    this.playerSprite.setPosition(p.x, p.y);
    const frame = p.facing * 4 + Math.floor(p.walkFrame);
    this.playerSprite.setFrame(frame);
    // 受伤闪烁
    if (p.hurtFlash > 0 && Math.floor(p.hurtFlash * 20) % 2 === 0) {
      this.playerSprite.setTint(0xff4040);
    } else if (p.invuln > 0 && p.dashTime <= 0) {
      this.playerSprite.setTint(0xffffff);
    } else {
      this.playerSprite.clearTint();
    }
    // 武器跟随
    if (p.attacking) {
      this.weaponSprite.setPosition(p.x, p.y);
    }
    // 敌人
    for (const es of this.enemySprites) {
      const e = es.enemy;
      if (!e.alive) {
        es.body.setVisible(false);
        es.hpBar.setVisible(false);
        es.hpBarBg.setVisible(false);
        continue;
      }
      // 90fps 平滑动画：使用 animFrame + Y 浮动 + 缩放呼吸，让 2 帧也有连续感
      const moving = Math.abs(e.vx) + Math.abs(e.vy) > 1;
      const frame = moving ? e.animFrame : 0;
      es.body.setFrame(frame);
      // Y 轴浮动（模拟步态，怪物移动时上下颠簸）
      const bobAmount = moving ? 1.5 : 0.6;
      const bobY = Math.sin(e.animTime * 18 + e.id) * bobAmount;
      es.body.setPosition(e.x, e.y + bobY);
      // 缩放呼吸（轻微脉动，让怪物有"活着"的感觉）
      const breathe = 1 + Math.sin(e.animTime * 14 + e.id) * 0.04;
      const baseScale = ENEMY_TYPES[e.type].isBoss ? SCALE * 2 : SCALE;
      es.body.setScale(baseScale * breathe, baseScale / breathe);
      if (e.hurtFlash > 0) {
        es.body.setTint(0xff8080);
      } else {
        es.body.clearTint();
      }
      // 血条
      const cfg = ENEMY_TYPES[e.type];
      const ratio = Math.max(0, e.hp / e.maxHp);
      const barW = cfg.isBoss ? 60 : 24;
      es.hpBar.setSize(barW * ratio, es.hpBar.height);
      es.hpBar.setPosition(e.x - barW / 2, e.y - (cfg.isBoss ? 30 : 16));
      es.hpBarBg.setPosition(e.x, e.y - (cfg.isBoss ? 30 : 16));
    }
    // 道具浮动
    for (const is of this.itemSprites) {
      is.bob += 0.05;
      is.sprite.setPosition(is.item.x, is.item.y + Math.sin(is.bob) * 2);
    }
  }

  // ============ 伤害文字更新 ============
  private updateDamageTexts(dt: number) {
    for (const dt2 of this.damageTexts) {
      dt2.life -= dt;
      dt2.text.y += dt2.vy * dt;
      dt2.text.setAlpha(Math.max(0, dt2.life / 0.8));
      if (dt2.life <= 0) {
        dt2.text.destroy();
      }
    }
    this.damageTexts = this.damageTexts.filter(d => d.life > 0);
  }

  // ============ 交互检查（楼梯/宝箱）============
  private checkInteractions() {
    if (this.isTransitioning) return;
    const p = this.state.player;
    const tx = Math.floor(p.x / 16);
    const ty = Math.floor(p.y / 16);
    const t = tileAt(this.state.dungeon, tx, ty);
    if (t === TILE_TYPE.STAIRS_DOWN) {
      // 检查 Boss 是否已清除
      const bossAlive = this.state.dungeon.enemies.some(e => ENEMY_TYPES[e.type]?.isBoss && e.alive);
      if (bossAlive) {
        // Boss 还活着，不能下楼
        this.hud.showToast('击败 Boss 才能下楼！', 800);
      } else {
        this.isTransitioning = true;
        this.hud.showToast('下楼…', 1000);
        this.time.delayedCall(400, () => {
          this.state.nextFloor();
          this.renderDungeon();
          this.refreshEnemySprites();
          this.refreshItemSprites();
          this.refreshShopkeepers();
          this.hud.showToast(`第 ${this.state.dungeon.floor} 层`, 2000);
          this.isTransitioning = false;
        });
      }
    } else if (t === TILE_TYPE.CHEST) {
      // 开宝箱
      this.openChest(tx, ty);
    }
  }

  private openChest(tx: number, ty: number) {
    const d = this.state.dungeon;
    // 把瓦片改成地板
    d.tiles[ty * MAP_W + tx] = TILE_TYPE.FLOOR;
    // 仅替换该瓦片精灵，避免全图重渲染（性能优化）
    this.swapTileSprite(tx, ty, `tile_floor_${(tx + ty) % 4}`);
    // 保底金币（楼层越高越多）
    const baseGold = 15 + d.floor * 5 + Math.floor(Math.random() * 20);
    this.state.player.gold += baseGold;
    this.state.totalGold += baseGold;
    this.hud.showToast(`宝箱：金币 +${baseGold}`);
    // 开宝箱金光粒子
    const px = tx * TILE_PIX + TILE_PIX / 2;
    const py = ty * TILE_PIX + TILE_PIX / 2;
    this.spawnDeathBurst(px, py, 0xffd030);
    this.flashScreen(0xffe040, 0.18, 100);
    // 30% 概率额外掉武器/装备
    const luck = Math.random();
    if (luck < 0.15) {
      // 武器（直接加属性）
      const weapons = [
        { name: '锋利匕首', atk: 3 },
        { name: '骑士剑', atk: 6 },
        { name: '战锤', atk: 9 },
      ];
      const w = weapons[Math.floor(Math.random() * weapons.length)];
      this.state.player.attack += w.atk;
      this.hud.showToast(`宝箱：${w.name}！攻击 +${w.atk}`, 2000);
    } else if (luck < 0.25) {
      // 防具
      const armors = [
        { name: '皮甲', def: 2 },
        { name: '锁子甲', def: 4 },
      ];
      const a = armors[Math.floor(Math.random() * armors.length)];
      this.state.player.defense += a.def;
      this.hud.showToast(`宝箱：${a.name}！防御 +${a.def}`, 2000);
    } else if (luck < 0.45) {
      // 药水
      const potions = ['potion_hp', 'potion_sp', 'potion_str', 'potion_def'];
      const p = potions[Math.floor(Math.random() * potions.length)];
      this.state.addItem(p, 1);
      const cfg = ITEMS[p];
      this.hud.showToast(`宝箱：${cfg.name} ×1`, 2000);
    } else if (luck < 0.55) {
      // 额外金币大礼包
      const bonus = 30 + d.floor * 10;
      this.state.player.gold += bonus;
      this.state.totalGold += bonus;
      this.hud.showToast(`宝箱：金币大礼包 +${bonus}！`, 2000);
    }
  }

  // 单瓦片精灵替换（开宝箱时局部刷新，避免整图重建）
  private swapTileSprite(tx: number, ty: number, newTextureKey: string) {
    const targetX = tx * TILE_PIX + TILE_PIX / 2;
    const targetY = ty * TILE_PIX + TILE_PIX / 2;
    if (!this.tileLayer) return;
    // 遍历容器找对应瓦片精灵
    const list = this.tileLayer.list as Phaser.GameObjects.Image[];
    for (const obj of list) {
      const img = obj as Phaser.GameObjects.Image;
      // 跳过 graphics 对象
      if (img.type !== 'Image') continue;
      if (Math.abs(img.x - targetX) < 1 && Math.abs(img.y - targetY) < 1) {
        img.setTexture(newTextureKey);
        return;
      }
    }
  }
}
