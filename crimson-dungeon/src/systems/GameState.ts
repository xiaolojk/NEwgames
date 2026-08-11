// 游戏状态容器 · 赤焰地牢
// 不依赖 Phaser 的纯逻辑层
import { PLAYER } from '../config';
import type { PlayerState, DungeonState, EnemyState } from '../types';
import { generateDungeon } from './Dungeon';
import { SaveSystem, type SaveData } from './SaveSystem';

export class GameState {
  player: PlayerState;
  dungeon: DungeonState;
  floor: number;

  totalKills = 0;
  totalGold = 0;
  startTime = 0;
  accumulatedTime = 0; // 从存档继承的秒数

  gameOver = false;
  pendingUpgrade = false;

  private seed: number;
  private lastSave = 0;

  constructor(loadFromSave = false) {
    const save = loadFromSave ? SaveSystem.load() : null;
    if (save) {
      this.seed = save.seed;
      this.floor = save.floor;
      this.dungeon = generateDungeon(save.floor, save.seed);
      this.player = {
        x: this.dungeon.spawnX, y: this.dungeon.spawnY, vx: 0, vy: 0,
        hp: Math.min(save.hp, save.maxHp), maxHp: save.maxHp,
        sp: Math.min(save.sp, save.maxSp), maxSp: save.maxSp,
        atk: save.atk, def: save.def, speed: save.speed,
        lv: save.lv, xp: save.xp, xpNext: save.xpNext,
        gold: save.gold, kills: save.kills,
        facing: save.facing,
        cdAtk: 0,
        dashTime: 0, dashDirX: 0, dashDirY: 0,
        invuln: 1.2, hurtFlash: 0,
        critRate: save.critRate ?? 0.05,
        critMul: save.critMul ?? 1.5,
        dashCostMul: save.dashCostMul ?? 1.0,
        dashInvulnBonus: save.dashInvulnBonus ?? 0,
        atkCdMul: save.atkCdMul ?? 1.0,
        walkTime: 0, walkFrame: 0,
        atkAnim: 0, atkAngle: 0,
      };
      this.totalKills = save.totalKills;
      this.totalGold = save.totalGold;
      this.accumulatedTime = save.playTime || 0;
      console.log(`[Crimson] 读档成功：第 ${save.floor} 层 · LV${save.lv} · 🪙${save.gold}`);
    } else {
      this.seed = (Date.now() & 0xffffffff) || 12345;
      this.floor = 1;
      this.dungeon = generateDungeon(1, this.seed);
      this.player = {
        x: this.dungeon.spawnX, y: this.dungeon.spawnY, vx: 0, vy: 0,
        hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
        sp: PLAYER.maxSp, maxSp: PLAYER.maxSp,
        atk: PLAYER.attack, def: PLAYER.defense, speed: PLAYER.speed,
        lv: 1, xp: 0, xpNext: PLAYER.xpToLevel(1),
        gold: 0, kills: 0,
        facing: 0,
        cdAtk: 0,
        dashTime: 0, dashDirX: 0, dashDirY: 0,
        invuln: 1.0, hurtFlash: 0,
        critRate: 0.05, critMul: 1.5,
        dashCostMul: 1.0, dashInvulnBonus: 0,
        atkCdMul: 1.0,
        walkTime: 0, walkFrame: 0,
        atkAnim: 0, atkAngle: 0,
      };
      console.log(`[Crimson] 新游戏 · 种子 ${this.seed}`);
    }
    this.startTime = Date.now();
  }

  // ========== 战斗 ==========
  damageEnemy(e: EnemyState, dmg: number, kx: number, ky: number): {
    killed: boolean; realDmg: number; crit: boolean;
  } {
    const crit = Math.random() < this.player.critRate;
    const realDmg = Math.max(1, Math.floor((crit ? dmg * this.player.critMul : dmg) - e.def));
    e.hp -= realDmg;
    e.hurtFlash = 0.18;
    e.kbX = kx; e.kbY = ky; e.kbT = 0.15;
    if (e.hp <= 0) {
      e.alive = false;
      this.onKill(e);
      return { killed: true, realDmg, crit };
    }
    return { killed: false, realDmg, crit };
  }

  damagePlayer(dmg: number, kx: number, ky: number): { died: boolean; realDmg: number } {
    if (this.player.invuln > 0) return { died: false, realDmg: 0 };
    const realDmg = Math.max(1, dmg - this.player.def);
    this.player.hp -= realDmg;
    this.player.hurtFlash = 0.3;
    this.player.invuln = 0.6;
    this.player.vx += kx;
    this.player.vy += ky;
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.onDie();
      return { died: true, realDmg };
    }
    return { died: false, realDmg };
  }

  private onKill(e: EnemyState) {
    const cfg: any = (window as any).__enemyTypes || {}; // 备用
    // 用 atk/gold 估算（按敌人 HP 分档）
    let xp = 8, gold = 3;
    if (e.type === 'slime')    { xp = 6;  gold = 3; }
    if (e.type === 'bat')      { xp = 5;  gold = 2; }
    if (e.type === 'skeleton') { xp = 10; gold = 5; }
    if (e.type === 'demon')    { xp = 18; gold = 10; }
    if (e.type === 'boss')     { xp = 80; gold = 60; }
    this.player.xp += xp;
    this.player.gold += gold;
    this.player.kills++;
    this.totalKills++;
    this.totalGold += gold;
    this.checkLvUp();
  }

  private checkLvUp() {
    while (this.player.xp >= this.player.xpNext) {
      this.player.xp -= this.player.xpNext;
      this.player.lv++;
      this.player.xpNext = PLAYER.xpToLevel(this.player.lv);
      this.pendingUpgrade = true;
    }
  }

  applyUpgrade(id: string) {
    const p = this.player;
    switch (id) {
      case 'hp':   p.maxHp += 30; p.hp = p.maxHp; break;
      case 'sp':   p.maxSp += 25; p.sp = p.maxSp; break;
      case 'atk':  p.atk += 5; break;
      case 'def':  p.def += 4; break;
      case 'spd':  p.speed = Math.floor(p.speed * 1.15); break;
      case 'cd':   p.atkCdMul = Math.max(0.4, p.atkCdMul * 0.8); break;
      case 'crit': p.critRate += 0.10; p.critMul += 0.5; break;
      case 'dash': p.dashCostMul *= 0.7; p.dashInvulnBonus += 0.088; break;
    }
    this.pendingUpgrade = false;
  }

  // ========== 下楼 ==========
  nextFloor() {
    this.floor++;
    this.seed = (Date.now() & 0xffffffff) || Math.floor(Math.random() * 1e9);
    this.dungeon = generateDungeon(this.floor, this.seed);
    this.player.x = this.dungeon.spawnX;
    this.player.y = this.dungeon.spawnY;
    this.player.vx = 0; this.player.vy = 0;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    this.player.sp = this.player.maxSp;
    this.player.invuln = 1.5;
    this.saveNow();
  }

  // ========== 存档 ==========
  autoSave(nowMs: number) {
    if (this.gameOver) return;
    if (nowMs - this.lastSave < 10000) return;
    this.lastSave = nowMs;
    this.saveNow();
  }

  saveNow(): boolean {
    const p = this.player;
    const data: SaveData = {
      version: 1, ts: Date.now(),
      hp: p.hp, maxHp: p.maxHp, sp: p.sp, maxSp: p.maxSp,
      atk: p.atk, def: p.def, speed: p.speed,
      lv: p.lv, xp: p.xp, xpNext: p.xpNext,
      gold: p.gold, kills: p.kills, facing: p.facing,
      critRate: p.critRate, critMul: p.critMul,
      dashCostMul: p.dashCostMul, dashInvulnBonus: p.dashInvulnBonus,
      atkCdMul: p.atkCdMul,
      floor: this.floor, seed: this.seed,
      totalKills: this.totalKills, totalGold: this.totalGold,
      playTime: this.accumulatedTime + (Date.now() - this.startTime) / 1000,
    };
    return SaveSystem.save(data);
  }

  private onDie() {
    this.gameOver = true;
    SaveSystem.deleteSave();
  }

  getPlaySeconds(): number {
    return this.accumulatedTime + (Date.now() - this.startTime) / 1000;
  }
}
