// 存档系统 · 橘子地牢
// 自动保存/读取游戏进度到 localStorage，刷新不丢数据
// Orgc 橘子工作室

import { PLAYER_BASE } from '../config';
import type { PlayerState } from '../types';
import type { InventorySlot } from './GameState';

const SAVE_KEY = 'orgc-dungeon-save-v1';
const SETTINGS_KEY = 'orgc-dungeon-settings-v1';

export interface SaveData {
  version: number;
  timestamp: number;
  // 玩家核心数据（不含瞬时位置速度）
  player: {
    hp: number;
    maxHp: number;
    sp: number;
    maxSp: number;
    attack: number;
    defense: number;
    speed: number;
    level: number;
    xp: number;
    xpNext: number;
    gold: number;
    killCount: number;
    facing: number;
  };
  // 地牢进度
  floor: number;
  dungeonSeed: number;
  totalKills: number;
  totalGold: number;
  playTime: number;  // 累计游戏时长（秒）
  // 背包
  inventory: InventorySlot[];
}

export interface GameSettings {
  bgmVolume: number;
  sfxVolume: number;
  screenShake: boolean;
}

export class SaveSystem {
  // 保存游戏
  static save(data: SaveData): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[Orgc] 存档失败', e);
      return false;
    }
  }

  // 读取存档
  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1) return null;
      return data;
    } catch (e) {
      console.warn('[Orgc] 读档失败', e);
      return null;
    }
  }

  // 是否有存档
  static hasSave(): boolean {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  // 删除存档
  static deleteSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('[Orgc] 删档失败', e);
    }
  }

  // 保存设置
  static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('[Orgc] 保存设置失败', e);
    }
  }

  // 读取设置
  static loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw) as GameSettings;
    } catch (e) {
      console.warn('[Orgc] 读取设置失败', e);
    }
    return { bgmVolume: 0.5, sfxVolume: 0.7, screenShake: true };
  }
}
