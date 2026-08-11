// 主游戏场景 · 赤焰地牢
import Phaser from 'phaser';
import {
  SCALE, TILE_PIX, MAP_W, MAP_H, TILE_TYPE,
  COLORS, PLAYER, ENEMY_TYPES, VIEW_W, VIEW_H,
} from '../config';
import type { EnemyState, ItemDrop } from '../types';
import { GameState } from '../systems/GameState';
import { HUD } from '../hud/HUD';
import {
  circleHitsWall, moveEntity, distSq, tileToWorld, worldToTile,
} from '../systems/Collision';

interface EnemySprite {
  body: Phaser.GameObjects.Sprite;
  barBg: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
  enemy: EnemyState;
}
interface ItemSprite {
  sprite: Phaser.GameObjects.Sprite;
  item: ItemDrop;
  bob: number;
}
interface ShopSprite {
  body: Phaser.GameObjects.Sprite;
  hint: Phaser.GameObjects.Text;
  x: number; y: number;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private hud!: HUD;
  private tileLayer!: Phaser.GameObjects.Container;
  private enemySprites: EnemySprite[] = [];
  private itemSprites: ItemSprite[] = [];
  private shopSprite: ShopSprite | null = null;
  private playerSpr!: Phaser.GameObjects.Sprite;
  private swordSpr!: Phaser.GameObjects.Sprite;
  private slashSpr!: Phaser.GameObjects.Sprite;
  private fogSpr!: Phaser.GameObjects.Image;
  private hurtFlashSpr!: Phaser.GameObjects.Rectangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mouseWorld = { x: 0, y: 0 };
  private hitStopUntil = 0;  // 命中停顿结束时间（ms）
  private sparkEmit: any;
  private bloodEmit: any;
  private goldEmit: any;

  constructor() { super('Game'); }

  shutdown() {
    this.hud.onUpgradePick = undefined;
    this.hud.onRestart = undefined;
  }

  create() {
    // 防止上一局残留模态框遮挡 canvas + 清除 hit-stop 残留
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
    document.getElementById('damage-layer')!.innerHTML = '';
    this.hitStopUntil = 0;

    // 初始化状态（自动加载存档）
    this.state = new GameState(true);

    // HUD
    this.hud = new HUD(this.state);
    this.hud.onUpgradePick = id => { this.state.applyUpgrade(id); };
    this.hud.onRestart = () => {
      this.hud.hideDeathScreen();
      this.scene.stop();
      this.scene.start('Menu');
    };

    // 相机设置
    this.cameras.main.setBackgroundColor(COLORS.wallDark);
    this.cameras.main.setRoundPixels(false);
    this.cameras.main.setZoom(1);

    // 粒子发射器（Phaser 3.60+ 新 API：add.particles(x,y,tex,cfg) 直接返回 ParticleEmitter）
    this.sparkEmit = this.add.particles(0, 0, 'pt_spark', {
      lifespan: 350, speed: { min: 80, max: 260 },
      scale: { start: 0.55, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      angle: { min: 0, max: 360 },
    }).setDepth(45);
    this.bloodEmit = this.add.particles(0, 0, 'pt_blood', {
      lifespan: 500, speed: { min: 60, max: 200 },
      scale: { start: 0.7, end: 0 },
      emitting: false,
      gravityY: 120,
      angle: { min: 0, max: 360 },
    }).setDepth(45);
    this.goldEmit = this.add.particles(0, 0, 'pt_gold', {
      lifespan: 600, speed: { min: 40, max: 140 },
      scale: { start: 0.5, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      angle: { min: 200, max: 340 },
    }).setDepth(45);

    // 地牢瓦片
    this.renderDungeon();

    // 玩家 + 武器 + 斩击特效
    this.playerSpr = this.add.sprite(this.state.player.x, this.state.player.y, 'spr_player')
      .setOrigin(0.5, 0.6).setDepth(20);
    this.swordSpr = this.add.sprite(this.state.player.x, this.state.player.y, 'spr_sword')
      .setOrigin(0.1, 0.5).setDepth(22).setVisible(false);
    this.slashSpr = this.add.sprite(0, 0, 'fx_slash')
      .setDepth(25).setVisible(false);

    // 雾气
    this.fogSpr = this.add.image(0, 0, 'fx_fog')
      .setDisplaySize(VIEW_W * 1.5, VIEW_H * 1.5)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(40);

    // 受伤红闪
    this.hurtFlashSpr = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0xff0000, 0)
      .setScrollFactor(0).setDepth(60);

    // 敌人/道具/商店
    this.refreshEnemies();
    this.refreshItems();
    this.refreshShop();

    // 相机跟随玩家
    this.cameras.main.startFollow(this.playerSpr, true, 0.14, 0.14);

    // 输入
    this.setupInput();

    // 开场提示
    this.hud.showToast(`⚔ 第 ${this.state.floor} 层 · 深入地牢`);
  }

  // ============================================================
  //  渲染
  // ============================================================
  private renderDungeon() {
    if (this.tileLayer) this.tileLayer.destroy(true);
    this.tileLayer = this.add.container(0, 0).setDepth(0);
    const d = this.state.dungeon;
    // 地板
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = d.tiles[y * MAP_W + x];
        if (t === TILE_TYPE.WALL) continue;
        let key = 'tile_fl_' + ((x + y) % 4);
        if (t === TILE_TYPE.STAIRS) key = 'tile_stairs';
        const wp = tileToWorld(x, y);
        const sp = this.add.image(wp.x, wp.y, key).setOrigin(0.5);
        this.tileLayer.add(sp);
      }
    }
    // 墙壁（只画暴露的，省性能）
    const g = this.add.graphics();
    const wallCol = COLORS.wallDark, topCol = COLORS.wallLight;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (d.tiles[y * MAP_W + x] !== TILE_TYPE.WALL) continue;
        let exposed = false;
        for (let dy = -1; dy <= 1 && !exposed; dy++) {
          for (let dx = -1; dx <= 1 && !exposed; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) { exposed = true; break; }
            if (d.tiles[ny * MAP_W + nx] !== TILE_TYPE.WALL) { exposed = true; }
          }
        }
        if (exposed) {
          g.fillStyle(wallCol, 1);
          g.fillRect(x * TILE_PIX, y * TILE_PIX, TILE_PIX, TILE_PIX);
          // 顶部高光（如果上方是地板）
          if (y + 1 < MAP_H && d.tiles[(y + 1) * MAP_W + x] !== TILE_TYPE.WALL) {
            g.fillStyle(topCol, 1);
            g.fillRect(x * TILE_PIX, y * TILE_PIX + TILE_PIX - 5, TILE_PIX, 5);
          }
        }
      }
    }
    this.tileLayer.add(g);
  }

  private refreshEnemies() {
    for (const es of this.enemySprites) { es.body.destroy(); es.barBg.destroy(); es.bar.destroy(); }
    this.enemySprites = [];
    for (const e of this.state.dungeon.enemies) {
      if (!e.alive) continue;
      const cfg = ENEMY_TYPES[e.type];
      const isBoss = e.type === 'boss';
      const body = this.add.sprite(e.x, e.y, 'enemy_' + e.type)
        .setOrigin(0.5, 0.6).setDepth(15);
      const barW = isBoss ? 80 : 30;
      const barH = isBoss ? 6 : 3;
      const offY = isBoss ? 42 : 22;
      const barBg = this.add.rectangle(e.x, e.y - offY, barW + 2, barH + 2, 0x000000, 0.8).setDepth(16);
      const bar = this.add.rectangle(e.x - barW / 2, e.y - offY, barW, barH, 0xff4050).setOrigin(0, 0.5).setDepth(17);
      this.enemySprites.push({ body, barBg, bar, enemy: e });
    }
  }

  private refreshItems() {
    for (const it of this.itemSprites) it.sprite.destroy();
    this.itemSprites = [];
    for (const it of this.state.dungeon.items) {
      const texKey = it.kind === 'gold' ? 'item_gold' : it.kind === 'hp' ? 'item_hp' : 'item_sp';
      const sp = this.add.sprite(it.x, it.y, texKey).setOrigin(0.5).setDepth(8);
      this.itemSprites.push({ sprite: sp, item: it, bob: Math.random() * Math.PI * 2 });
    }
  }

  private refreshShop() {
    if (this.shopSprite) { this.shopSprite.body.destroy(); this.shopSprite.hint.destroy(); this.shopSprite = null; }
    if (!this.state.dungeon.hasShop) return;
    const x = this.state.dungeon.shopX, y = this.state.dungeon.shopY;
    const body = this.add.sprite(x, y, 'npc_shop').setOrigin(0.5, 0.65).setDepth(18);
    const hint = this.add.text(x, y - 60, '🛒 神秘商人  [E]', {
      fontFamily: 'Microsoft YaHei', fontSize: 13, color: '#ffe080',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(19);
    this.tweens.add({ targets: body, y: y - 4, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.shopSprite = { body, hint, x, y };
  }

  // ============================================================
  //  输入
  // ============================================================
  private setupInput() {
    if (!this.input.keyboard) return;
    this.keys = this.input.keyboard.addKeys(
      'W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,E,ONE,TWO,THREE,FOUR,FIVE',
    ) as any;
    // 鼠标：攻击
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // 优先商店
      if (this.tryOpenShopNear()) return;
      this.mouseWorld.x = p.worldX;
      this.mouseWorld.y = p.worldY;
      this.tryAttack(p.worldX, p.worldY);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.mouseWorld.x = p.worldX;
      this.mouseWorld.y = p.worldY;
    });
    // E 商店
    this.input.keyboard.on('keydown-E', () => {
      if (!this.tryOpenShopNear()) {
        this.hud.showToast('附近没有商人');
      }
    });
  }

  private tryOpenShopNear(): boolean {
    if (!this.state.dungeon.hasShop || this.state.gameOver) return false;
    const p = this.state.player;
    const dx = this.state.dungeon.shopX - p.x, dy = this.state.dungeon.shopY - p.y;
    if (dx * dx + dy * dy < 50 * 50) {
      // 简单商店：给玩家随机 buff，收金币
      const p2 = this.state.player;
      if (p2.gold >= 15) {
        p2.gold -= 15;
        // 随机效果
        const roll = Math.random();
        if (roll < 0.4) { p2.hp = Math.min(p2.maxHp, p2.hp + 40); this.hud.showToast('🛒 +40 HP (-15🪙)'); }
        else if (roll < 0.7) { p2.sp = p2.maxSp; this.hud.showToast('🛒 体力回满 (-15🪙)'); }
        else if (roll < 0.9) { p2.atk += 2; this.hud.showToast('🛒 +2 攻击 (-15🪙)'); }
        else { p2.maxHp += 10; p2.hp += 10; this.hud.showToast('🛒 +10 最大HP (-15🪙)'); }
        this.goldEmit.emitParticleAt(this.state.dungeon.shopX, this.state.dungeon.shopY, 10);
      } else {
        this.hud.showToast('🪙 金币不足 (需 15)');
      }
      return true;
    }
    return false;
  }

  // ============================================================
  //  攻击
  // ============================================================
  private tryAttack(tx: number, ty: number) {
    const p = this.state.player;
    if (p.cdAtk > 0 || p.dashTime > 0 || this.state.gameOver || this.state.pendingUpgrade) return;
    p.cdAtk = PLAYER.attackCooldown * p.atkCdMul;
    p.atkAnim = 0.18;
    const angle = Math.atan2(ty - p.y, tx - p.x);
    p.atkAngle = angle;
    // 斩击特效
    const sx = p.x + Math.cos(angle) * 22;
    const sy = p.y + Math.sin(angle) * 22;
    this.slashSpr.setPosition(sx, sy).setRotation(angle).setVisible(true).setAlpha(1);
    this.tweens.add({
      targets: this.slashSpr,
      alpha: 0, scale: 1.15,
      duration: 170,
      onComplete: () => { this.slashSpr.setVisible(false); this.slashSpr.setScale(1); },
    });
    // 剑出鞘
    this.swordSpr.setVisible(true).setPosition(p.x, p.y).setRotation(angle);
    this.tweens.add({
      targets: this.swordSpr, duration: 180,
      onComplete: () => this.swordSpr.setVisible(false),
    });
    this.checkAttackHits(angle);
  }

  private checkAttackHits(angle: number) {
    const p = this.state.player;
    const range = PLAYER.attackRange;
    const arc = PLAYER.attackArc;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    let maxImpact = 0; // 命中停顿强度
    let hitAny = false;

    for (const e of this.state.dungeon.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > (range + e.radius) * (range + e.radius)) continue;
      // 扇形：点积判断是否在前方锥形
      const nd = Math.sqrt(d2) || 1;
      const nx = dx / nd, ny = dy / nd;
      const dot = nx * cosA + ny * sinA;
      if (dot < Math.cos(arc / 2)) continue; // 不在扇形内
      // 命中！
      const knockPow = 120;
      const kx = nx * knockPow, ky = ny * knockPow;
      const res = this.state.damageEnemy(e, p.atk, kx, ky);
      hitAny = true;
      // 伤害飘字（世界→屏幕坐标）
      const cam = this.cameras.main;
      const world = cam.worldView;
      const sx = (e.x - world.x) + 0;
      const sy = (e.y - world.y);
      this.hud.spawnDamage(sx, sy, res.realDmg, res.crit ? 'crit' : 'normal');
      // 火花粒子
      this.sparkEmit.emitParticleAt(e.x, e.y, res.crit ? 18 : 10);
      // 击杀爆血
      if (res.killed) {
        this.bloodEmit.emitParticleAt(e.x, e.y, 28);
        maxImpact = Math.max(maxImpact, res.crit ? 90 : 120); // 击杀停顿更久
        // 击杀环
        this.add.circle(e.x, e.y, 6, 0xffffff, 0.9).setDepth(42)
          .setStrokeStyle(3, 0xff4050, 0.8)
          .setScale(1)
          .setStrokeStyle(4, 0xff80a0, 0.8);
        const killRing = this.add.circle(e.x, e.y, 4, 0xffffff, 0)
          .setStrokeStyle(3, 0xff80a0, 0.9).setDepth(42);
        this.tweens.add({
          targets: killRing, radius: 32, alpha: 0, strokeAlpha: 0,
          duration: 280, ease: 'Cubic.Out',
          onComplete: () => killRing.destroy(),
        });
      } else {
        maxImpact = Math.max(maxImpact, res.crit ? 80 : 40);
      }
      // 相机震动
      const shakeD = res.crit ? 0.008 : res.killed ? 0.01 : 0.004;
      const shakeT = res.killed ? 220 : res.crit ? 160 : 90;
      this.cameras.main.shake(shakeT, shakeD, false);
    }

    // 屏幕闪光（命中时白色全屏闪一下）
    if (hitAny) {
      const flash = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0xffffff, 0)
        .setScrollFactor(0).setDepth(58);
      this.tweens.add({
        targets: flash,
        alpha: { from: maxImpact > 80 ? 0.25 : 0.12, to: 0 },
        duration: maxImpact > 80 ? 150 : 80,
        onComplete: () => flash.destroy(),
      });
    }

    // 命中停顿（hit-stop）
    if (hitAny && maxImpact > 0) {
      this.hitStopUntil = Math.max(this.hitStopUntil, this.time.now + maxImpact);
    }
  }

  // ============================================================
  //  主循环
  // ============================================================
  update(time: number, delta: number) {
    // 命中停顿安全上限：最多 200ms
    if (this.hitStopUntil > time + 200) this.hitStopUntil = time + 200;
    const inHitStop = time < this.hitStopUntil;
    const dt = inHitStop ? 0 : Math.min(delta / 1000, 0.05);

    // 死亡：只渲染不更新逻辑
    if (this.state.gameOver) {
      this.renderHud();
      this.hud.showDeathScreen();
      return;
    }

    // 升级等待：冻结，但允许渲染
    if (this.state.pendingUpgrade) {
      this.hud.showUpgradePick();
      this.state.pendingUpgrade = false; // 只触发一次
    }

    // ============ 更新玩家 ============
    this.updatePlayer(dt, time);

    // ============ 更新敌人 ============
    this.updateEnemies(dt);

    // ============ 更新道具（拾取） ============
    this.updateItems(dt);

    // ============ 检查楼梯 ============
    this.checkStairs();

    // ============ 渲染同步 ============
    this.renderSyncSprites();

    // ============ HUD 数值更新 ============
    this.renderHud();

    // 自动存档
    this.state.autoSave(time);
  }

  private updatePlayer(dt: number, time: number) {
    const p = this.state.player;
    const k = this.keys;
    // 冷却 / 无敌
    p.cdAtk = Math.max(0, p.cdAtk - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.atkAnim = Math.max(0, p.atkAnim - dt);
    // 体力自然恢复
    p.sp = Math.min(p.maxSp, p.sp + 14 * dt);

    // 移动方向
    let mx = 0, my = 0;
    if (k?.W?.isDown || k?.UP?.isDown) my -= 1;
    if (k?.S?.isDown || k?.DOWN?.isDown) my += 1;
    if (k?.A?.isDown || k?.LEFT?.isDown) mx -= 1;
    if (k?.D?.isDown || k?.RIGHT?.isDown) mx += 1;
    // J 键攻击（如果鼠标位置未知，朝 facing）
    if (k?.J?.isDown) {
      const dirs = [[0, 1], [-1, 0], [1, 0], [0, -1]];
      const d = dirs[p.facing];
      this.tryAttack(p.x + d[0] * 50, p.y + d[1] * 50);
    }
    // 冲刺
    const dashCost = PLAYER.dashCost * p.dashCostMul;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      moveEntity(this.state.dungeon, p as any,
        p.dashDirX * PLAYER.dashSpeed * dt,
        p.dashDirY * PLAYER.dashSpeed * dt,
        PLAYER.radius);
      // 冲刺拖尾残影
      if (Math.random() < 0.7) {
        const ghost = this.add.sprite(p.x, p.y, 'spr_player')
          .setOrigin(0.5, 0.6).setDepth(19).setAlpha(0.4);
        ghost.setTint(0xffc0e0);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
      }
    } else {
      // 冲刺触发
      if (k?.SPACE?.isDown && p.sp >= dashCost && (mx !== 0 || my !== 0)) {
        p.sp -= dashCost;
        const n = Math.hypot(mx, my) || 1;
        p.dashDirX = mx / n; p.dashDirY = my / n;
        p.dashTime = PLAYER.dashTime;
        p.invuln = Math.max(p.invuln, PLAYER.dashInvuln + p.dashInvulnBonus);
        // 冲刺粒子
        this.sparkEmit.emitParticleAt(p.x, p.y, 8);
      }
      // 普通移动
      if (mx !== 0 || my !== 0) {
        const n = Math.hypot(mx, my);
        const vx = (mx / n) * p.speed * dt;
        const vy = (my / n) * p.speed * dt;
        moveEntity(this.state.dungeon, p as any, vx, vy, PLAYER.radius);
        // facing
        if (Math.abs(mx) > Math.abs(my)) p.facing = mx < 0 ? 1 : 2;
        else p.facing = my < 0 ? 3 : 0;
        // 行走动画计时（60fps 动画感）
        p.walkTime += dt;
        if (p.walkTime > 0.05) {  // 约 60fps 对应阈值
          p.walkTime = 0;
          p.walkFrame = (p.walkFrame + 1) % 4;
        }
      } else {
        p.walkFrame = 0; p.walkTime = 0;
      }
    }
  }

  private updateEnemies(dt: number) {
    const p = this.state.player;
    for (const e of this.state.dungeon.enemies) {
      if (!e.alive) continue;
      e.hurtFlash = Math.max(0, e.hurtFlash - dt);
      e.animTime += dt;
      // 90fps 动画感
      if (e.animTime > 0.011) {
        e.animTime = 0;
        e.animFrame = (e.animFrame + 1) % 8;
      }
      // 击退
      if (e.kbT > 0) {
        e.kbT -= dt;
        const t = Math.max(0, e.kbT / 0.15);
        moveEntity(this.state.dungeon, e as any,
          e.kbX * t * dt * 6.5, e.kbY * t * dt * 6.5, e.radius);
      } else {
        // AI
        const cfg = ENEMY_TYPES[e.type];
        const dx = p.x - e.x, dy = p.y - e.y;
        const d2 = dx * dx + dy * dy;
        const aggroR = e.aggro || e.type === 'boss' ? 400 * 400 : 180 * 180;
        const atkR = cfg.attackRange * cfg.attackRange;
        if (d2 < aggroR) {
          e.aggro = true;
          const nd = Math.sqrt(d2) || 1;
          const nx = dx / nd, ny = dy / nd;
          // 在攻击范围外：靠近
          if (d2 > atkR * 0.75) {
            moveEntity(this.state.dungeon, e as any,
              nx * cfg.speed * dt, ny * cfg.speed * dt, e.radius);
          } else {
            // 攻击
            if (e.lastAtk <= 0) {
              e.lastAtk = cfg.attackCd;
              const res = this.state.damagePlayer(cfg.atk, nx * 120, ny * 120);
              const cam = this.cameras.main;
              const sx = p.x - cam.worldView.x;
              const sy = p.y - cam.worldView.y;
              this.hud.spawnDamage(sx, sy, res.realDmg, 'player');
              // 玩家受伤红闪 + 震动
              if (res.realDmg > 0) {
                this.hurtFlashSpr.setAlpha(0.35);
                this.tweens.add({
                  targets: this.hurtFlashSpr, alpha: 0, duration: 260,
                });
                this.cameras.main.shake(160, 0.006);
                this.bloodEmit.emitParticleAt(p.x, p.y, 12);
              }
            } else {
              e.lastAtk -= dt;
            }
          }
        } else {
          // 闲逛
          if (Math.random() < 0.008) {
            e.vx = (Math.random() - 0.5) * cfg.speed * 0.4;
            e.vy = (Math.random() - 0.5) * cfg.speed * 0.4;
          }
          moveEntity(this.state.dungeon, e as any, e.vx * dt, e.vy * dt, e.radius);
        }
      }
    }
    // 清理死亡敌人（移除精灵）
    for (let i = this.enemySprites.length - 1; i >= 0; i--) {
      const es = this.enemySprites[i];
      if (!es.enemy.alive) {
        es.body.destroy(); es.barBg.destroy(); es.bar.destroy();
        this.enemySprites.splice(i, 1);
      }
    }
  }

  private updateItems(dt: number) {
    const p = this.state.player;
    const pickupR = 16 * 16;
    for (let i = this.itemSprites.length - 1; i >= 0; i--) {
      const s = this.itemSprites[i];
      // 上下浮动
      s.bob += dt * 3;
      s.sprite.setY(s.item.y + Math.sin(s.bob) * 3);
      // 磁吸 + 拾取
      const dx = p.x - s.item.x, dy = p.y - s.item.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 32 * 32) {
        const nd = Math.sqrt(d2) || 1;
        const pull = 220 * dt;
        s.item.x += (dx / nd) * pull;
        s.item.y += (dy / nd) * pull;
        s.sprite.setPosition(s.item.x, s.item.y + Math.sin(s.bob) * 3);
      }
      if (d2 < pickupR) {
        // 拾取
        if (s.item.kind === 'hp') {
          const h = 30 * s.item.amount;
          p.hp = Math.min(p.maxHp, p.hp + h);
          const cam = this.cameras.main;
          this.hud.spawnDamage(p.x - cam.worldView.x, p.y - 20 - cam.worldView.y, h, 'heal');
        } else if (s.item.kind === 'sp') {
          const sp = 25 * s.item.amount;
          p.sp = Math.min(p.maxSp, p.sp + sp);
          const cam = this.cameras.main;
          this.hud.spawnDamage(p.x - cam.worldView.x, p.y - 20 - cam.worldView.y, sp, 'heal');
        } else if (s.item.kind === 'gold') {
          p.gold += s.item.amount;
          this.state.totalGold += s.item.amount;
          this.goldEmit.emitParticleAt(s.item.x, s.item.y, 8);
          this.hud.showToast(`🪙 +${s.item.amount}`);
        }
        s.sprite.destroy();
        this.itemSprites.splice(i, 1);
        // 从 dungeon.items 中移除
        const idx2 = this.state.dungeon.items.indexOf(s.item);
        if (idx2 >= 0) this.state.dungeon.items.splice(idx2, 1);
      }
    }
  }

  private checkStairs() {
    const p = this.state.player;
    const dx = p.x - this.state.dungeon.stairsX;
    const dy = p.y - this.state.dungeon.stairsY;
    if (dx * dx + dy * dy < 20 * 20) {
      // 下楼
      const cam = this.cameras.main;
      cam.fade(500, 0, 0, 0);
      this.state.nextFloor();
      this.time.delayedCall(450, () => {
        this.renderDungeon();
        this.refreshEnemies();
        this.refreshItems();
        this.refreshShop();
        cam.fadeFrom(400, 0, 0, 0, false);
        this.hud.showToast(`🔥 第 ${this.state.floor} 层 🔥`);
      });
    }
  }

  // 同步状态→精灵
  private renderSyncSprites() {
    const p = this.state.player;
    this.playerSpr.setPosition(p.x, p.y);
    // 行走轻微上下浮动（60fps 动画感）
    const bobY = p.walkFrame === 1 || p.walkFrame === 3 ? -1 : 0;
    this.playerSpr.y += bobY;
    // 受伤闪白
    this.playerSpr.clearTint();
    if (p.hurtFlash > 0) {
      const f = Phaser.Display.Color.GetColor(255, 80, 80);
      this.playerSpr.setTint(f);
    }
    if (p.invuln > 0 && Math.floor(this.time.now / 60) % 2 === 0) {
      this.playerSpr.setAlpha(0.55);
    } else {
      this.playerSpr.setAlpha(1);
    }
    // 朝向（简单翻转）
    if (p.facing === 1) this.playerSpr.setScale(-1 * SCALE * 0.55, SCALE * 0.55);
    else this.playerSpr.setScale(SCALE * 0.55);
    // 剑跟随
    if (this.swordSpr.visible) {
      this.swordSpr.setPosition(p.x, p.y).setRotation(p.atkAngle);
      this.swordSpr.setScale(SCALE * 0.6);
    }
    // 雾气跟随玩家（以屏幕坐标）
    this.fogSpr.setPosition(p.x, p.y);

    // 敌人精灵同步
    for (const es of this.enemySprites) {
      const e = es.enemy;
      es.body.setPosition(e.x, e.y);
      // 90fps 感觉：Y 小幅上下浮动 + 缩放呼吸
      const animBob = Math.sin(e.animFrame / 8 * Math.PI * 2) * 1.5;
      es.body.y += animBob;
      const animScale = 1 + Math.sin(e.animFrame / 8 * Math.PI * 4) * 0.025;
      es.body.setScale(animScale * SCALE * 0.5);
      // 受伤闪白
      es.body.clearTint();
      if (e.hurtFlash > 0) es.body.setTint(0xffffff);
      // 血条
      const cfg = ENEMY_TYPES[e.type];
      const barW = e.type === 'boss' ? 80 : 30;
      const barH = e.type === 'boss' ? 6 : 3;
      const offY = e.type === 'boss' ? 42 : 22;
      es.barBg.setPosition(e.x, e.y - offY);
      es.bar.setPosition(e.x - barW / 2, e.y - offY);
      es.bar.setSize(Math.max(0, (e.hp / e.maxHp) * barW), barH);
    }
  }

  private renderHud() {
    this.hud.update();
  }
}
