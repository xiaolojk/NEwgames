// 存档系统 · 赤焰地牢
// localStorage 保存 + 自动加载。HP<=0 视为坏档删除。
const KEY = 'crimson-dungeon-save-v1';

export interface SaveData {
  version: number;
  ts: number;
  // 玩家
  hp: number; maxHp: number;
  sp: number; maxSp: number;
  atk: number; def: number; speed: number;
  lv: number; xp: number; xpNext: number;
  gold: number; kills: number;
  facing: number;
  critRate: number; critMul: number;
  dashCostMul: number; dashInvulnBonus: number;
  atkCdMul: number;
  // 进度
  floor: number;
  seed: number;
  // 统计
  totalKills: number;
  totalGold: number;
  playTime: number;
}

export const SaveSystem = {
  save(data: SaveData): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { console.warn('[Crimson] 存档失败', e); return false; }
  },
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as SaveData;
      if (!d || d.version !== 1) return null;
      // 坏档检查：HP<=0 或 非法数据
      if (typeof d.hp !== 'number' || d.hp <= 0) {
        console.warn('[Crimson] 存档 HP<=0，删除坏档');
        SaveSystem.deleteSave();
        return null;
      }
      return d;
    } catch (e) {
      console.warn('[Crimson] 读档失败', e);
      SaveSystem.deleteSave();
      return null;
    }
  },
  deleteSave(): void {
    try { localStorage.removeItem(KEY); } catch { /* empty */ }
  },
  exists(): boolean {
    try { return !!localStorage.getItem(KEY); } catch { return false; }
  },
};
