// 游戏状态管理 · 橘子地牢
// 不依赖 Phaser 的纯状态容器，所有系统围绕此状态工作
// Orgc 橘子工作室

import { PLAYER_BASE, ITEMS, UPGRADES, ENEMY_TYPES } from '../config';
import type { PlayerState, DungeonState, EnemyState, ItemDrop } from '../types';
import { generateDungeon } from './DungeonGenerator';
import { SaveSystem, type SaveData } from './SaveSystem';

export interface InventorySlot {
  itemId: string;
  count: number;
}

export class GameState {
  player: PlayerState;
  dungeon: DungeonState;
  inventory: InventorySlot[] = [];
  totalKills = 0;
  totalGold = 0;
  startTime = 0;
  gameOver = false;
  paused = false;
  pendingUpgrade = false;
  private dungeonSeed: number;
  private lastSaveTime = 0;
  private accumulatedPlayTime = 0;  // 从存档继承的累计游戏时长

  constructor(loadFromSave: boolean = false) {
    const save = loadFromSave ? SaveSystem.load() : null;
    // 存档有效性检查：HP 必须大于 0，否则视为损坏存档，删除并开新游戏
    if (save && save.player.hp <= 0) {
      console.warn('[Orgc] 存档 HP<=0，视为损坏，删除存档开新游戏');
      SaveSystem.deleteSave();
      // 走新游戏流程
      this.dungeonSeed = Date.now() & 0xffffffff;
      this.dungeon = generateDungeon(1, this.dungeonSeed);
      this.player = {
        x: 0, y: 0, vx: 0, vy: 0,
        hp: PLAYER_BASE.maxHp, maxHp: PLAYER_BASE.maxHp,
        sp: PLAYER_BASE.maxSp, maxSp: PLAYER_BASE.maxSp,
        attack: PLAYER_BASE.attack, defense: PLAYER_BASE.defense,
        speed: PLAYER_BASE.speed,
        level: 1, xp: 0, xpNext: PLAYER_BASE.xpToLevel(1),
        gold: 0, killCount: 0,
        facing: 0,
        attackCooldown: 0, dashTime: 0, dashDir: { x: 0, y: 0 },
        hurtFlash: 0, invuln: 0,
        walkFrame: 0, walkTime: 0,
        attacking: false, attackTime: 0, attackAngle: 0,
      };
      this.player.x = this.dungeon.spawnX;
      this.player.y = this.dungeon.spawnY;
      this.startTime = Date.now();
      this.addItem('potion_hp', 2);
      return;
    }
    if (save) {
      // 从存档恢复
      this.dungeonSeed = save.dungeonSeed;
      this.dungeon = generateDungeon(save.floor, save.dungeonSeed);
      this.player = {
        x: this.dungeon.spawnX, y: this.dungeon.spawnY, vx: 0, vy: 0,
        hp: save.player.hp, maxHp: save.player.maxHp,
        sp: save.player.sp, maxSp: save.player.maxSp,
        attack: save.player.attack, defense: save.player.defense,
        speed: save.player.speed,
        level: save.player.level, xp: save.player.xp, xpNext: save.player.xpNext,
        gold: save.player.gold, killCount: save.player.killCount,
        facing: save.player.facing as 0 | 1 | 2 | 3,
        attackCooldown: 0, dashTime: 0, dashDir: { x: 0, y: 0 },
        hurtFlash: 0, invuln: 1.0,  // 加载后短暂无敌
        walkFrame: 0, walkTime: 0,
        attacking: false, attackTime: 0, attackAngle: 0,
      };
      this.inventory = save.inventory.map(s => ({ ...s }));
      this.totalKills = save.totalKills;
      this.totalGold = save.totalGold;
      this.accumulatedPlayTime = save.playTime || 0;
      this.startTime = Date.now();
      console.log(`[Orgc] 从存档恢复：第 ${save.floor} 层 · 等级 ${save.player.level} · 金币 ${save.player.gold}`);
    } else {
      // 新游戏
      this.dungeonSeed = Date.now() & 0xffffffff;
      this.dungeon = generateDungeon(1, this.dungeonSeed);
      this.player = {
        x: 0, y: 0, vx: 0, vy: 0,
        hp: PLAYER_BASE.maxHp, maxHp: PLAYER_BASE.maxHp,
        sp: PLAYER_BASE.maxSp, maxSp: PLAYER_BASE.maxSp,
        attack: PLAYER_BASE.attack, defense: PLAYER_BASE.defense,
        speed: PLAYER_BASE.speed,
        level: 1, xp: 0, xpNext: PLAYER_BASE.xpToLevel(1),
        gold: 0, killCount: 0,
        facing: 0,
        attackCooldown: 0, dashTime: 0, dashDir: { x: 0, y: 0 },
        hurtFlash: 0, invuln: 0,
        walkFrame: 0, walkTime: 0,
        attacking: false, attackTime: 0, attackAngle: 0,
      };
      this.player.x = this.dungeon.spawnX;
      this.player.y = this.dungeon.spawnY;
      this.startTime = Date.now();
      this.addItem('potion_hp', 2);
    }
  }

  // ============ 道具系统 ============
  addItem(itemId: string, count: number = 1): boolean {
    const cfg = ITEMS[itemId];
    if (!cfg) return false;
    // 找现有堆叠
    for (const slot of this.inventory) {
      if (slot.itemId === itemId && slot.count < cfg.stack) {
        const canAdd = Math.min(count, cfg.stack - slot.count);
        slot.count += canAdd;
        count -= canAdd;
        if (count <= 0) return true;
      }
    }
    // 新堆叠
    while (count > 0 && this.inventory.length < 12) {
      const canAdd = Math.min(count, cfg.stack);
      this.inventory.push({ itemId, count: canAdd });
      count -= canAdd;
    }
    return count <= 0;
  }

  useItem(slotIndex: number): boolean {
    const slot = this.inventory[slotIndex];
    if (!slot || slot.count <= 0) return false;
    const cfg = ITEMS[slot.itemId];
    if (!cfg || cfg.type !== 'potion') return false;
    const eff = cfg.effect || {};
    if (eff.heal) this.player.hp = Math.min(this.player.maxHp, this.player.hp + eff.heal);
    if (eff.healSp) this.player.sp = Math.min(this.player.maxSp, this.player.sp + eff.healSp);
    if (eff.attackUp) this.player.attack += eff.attackUp;
    if (eff.defenseUp) this.player.defense += eff.defenseUp;
    slot.count--;
    if (slot.count <= 0) this.inventory.splice(slotIndex, 1);
    return true;
  }

  // ============ 战斗 ============
  damageEnemy(enemy: EnemyState, dmg: number, knockX: number, knockY: number): boolean {
    const realDmg = Math.max(1, dmg - enemy.defense);
    enemy.hp -= realDmg;
    enemy.hurtFlash = 0.2;
    enemy.knockback = { x: knockX, y: knockY, t: 0.15 };
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.onEnemyKilled(enemy);
      return true;
    }
    return false;
  }

  damagePlayer(dmg: number, knockX: number, knockY: number): boolean {
    if (this.player.invuln > 0) return false;
    const realDmg = Math.max(1, dmg - this.player.defense);
    this.player.hp -= realDmg;
    this.player.hurtFlash = 0.3;
    this.player.invuln = 0.6;
    this.player.vx += knockX;
    this.player.vy += knockY;
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver = true;
      this.onGameOver();  // 死亡清除存档
      return true;
    }
    return false;
  }

  onEnemyKilled(enemy: EnemyState) {
    const cfg = ENEMY_TYPES[enemy.type];
    const xp = cfg ? cfg.xp : 8;
    const gold = cfg ? cfg.gold : 2;
    this.player.xp += xp;
    this.player.killCount++;
    this.totalKills++;
    this.player.gold += gold;
    this.totalGold += gold;
    // 检查升级
    this.checkLevelUp();
  }

  checkLevelUp() {
    while (this.player.xp >= this.player.xpNext) {
      this.player.xp -= this.player.xpNext;
      this.player.level++;
      this.player.xpNext = PLAYER_BASE.xpToLevel(this.player.level);
      this.pendingUpgrade = true;
    }
  }

  applyUpgrade(upgradeId: string) {
    const p = this.player;
    switch (upgradeId) {
      case 'hp': p.maxHp += 30; p.hp = p.maxHp; break;
      case 'atk': p.attack += 4; break;
      case 'def': p.defense += 3; break;
      case 'spd': p.speed = Math.floor(p.speed * 1.15); break;
      case 'sp': p.maxSp += 30; p.sp = p.maxSp; break;
      case 'cooldown': /* 由 GameScene 处理 */ break;
    }
    this.pendingUpgrade = false;
  }

  // ============ 楼层递进 ============
  nextFloor() {
    const nextFloorNum = this.dungeon.floor + 1;
    this.dungeonSeed = Date.now() & 0xffffffff;
    this.dungeon = generateDungeon(nextFloorNum, this.dungeonSeed);
    this.player.x = this.dungeon.spawnX;
    this.player.y = this.dungeon.spawnY;
    this.player.vx = 0; this.player.vy = 0;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);  // 下楼回 20 血
    this.player.sp = this.player.maxSp;
    this.player.invuln = 1.0;
    this.saveGame();  // 下楼自动存档
  }

  // ============ 存档系统 ============
  // 自动保存（每 10 秒一次，由 GameScene 调用）
  autoSave(now: number): void {
    if (this.gameOver) return;
    if (now - this.lastSaveTime < 10000) return;  // 10 秒一次
    this.lastSaveTime = now;
    this.saveGame();
  }

  // 主动保存
  saveGame(): boolean {
    const p = this.player;
    const data: SaveData = {
      version: 1,
      timestamp: Date.now(),
      player: {
        hp: p.hp, maxHp: p.maxHp,
        sp: p.sp, maxSp: p.maxSp,
        attack: p.attack, defense: p.defense,
        speed: p.speed,
        level: p.level, xp: p.xp, xpNext: p.xpNext,
        gold: p.gold, killCount: p.killCount,
        facing: p.facing,
      },
      floor: this.dungeon.floor,
      dungeonSeed: this.dungeonSeed,
      totalKills: this.totalKills,
      totalGold: this.totalGold,
      playTime: this.accumulatedPlayTime + (Date.now() - this.startTime) / 1000,
      inventory: this.inventory.map(s => ({ ...s })),
    };
    return SaveSystem.save(data);
  }

  // 死亡时清除存档
  onGameOver(): void {
    SaveSystem.deleteSave();
  }

  // ============ 存档（localStorage）============
  saveBest() {
    try {
      const best = JSON.parse(localStorage.getItem('orgc_dungeon_best') || '{}');
      const stats = {
        floor: this.dungeon.floor,
        kills: this.totalKills,
        gold: this.totalGold,
        level: this.player.level,
        time: Math.floor((Date.now() - this.startTime) / 1000),
      };
      const prev = best || {};
      if (!prev.floor || stats.floor > prev.floor) {
        localStorage.setItem('orgc_dungeon_best', JSON.stringify(stats));
      }
    } catch (e) {
      // 忽略
    }
  }

  loadBest(): any {
    try {
      return JSON.parse(localStorage.getItem('orgc_dungeon_best') || '{}');
    } catch (e) {
      return {};
    }
  }
}
