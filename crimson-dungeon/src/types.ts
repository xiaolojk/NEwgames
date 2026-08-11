// 类型定义 · 赤焰地牢

export interface PlayerState {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  sp: number; maxSp: number;
  atk: number; def: number; speed: number;
  lv: number; xp: number; xpNext: number;
  gold: number; kills: number;
  facing: number; // 0=下 1=左 2=右 3=上

  cdAtk: number;       // 攻击冷却剩余秒
  dashTime: number;    // 冲刺剩余秒
  dashDirX: number; dashDirY: number;
  invuln: number;      // 无敌剩余秒
  hurtFlash: number;   // 受伤闪白剩余秒

  critRate: number;    // 暴击率
  critMul: number;     // 暴击倍率
  dashCostMul: number; // 冲刺消耗倍率
  dashInvulnBonus: number; // 冲刺无敌帧增加
  atkCdMul: number;    // 攻击冷却倍率

  walkTime: number;    // 行走动画计时
  walkFrame: number;   // 行走帧
  atkAnim: number;     // 攻击动画剩余秒
  atkAngle: number;    // 攻击角度
}

export interface EnemyState {
  id: number;
  type: string;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  atk: number; def: number; speed: number;
  radius: number;
  alive: boolean;
  hurtFlash: number;
  kbX: number; kbY: number; kbT: number; // 击退
  lastAtk: number;
  animTime: number; animFrame: number;
  aggro: boolean; // 是否激活（玩家靠近才追）
}

export interface ItemDrop {
  id: number;
  kind: 'hp' | 'sp' | 'gold' | 'atkBuff';
  x: number; y: number;
  amount: number;
  vy: number;
}

export interface Projectile {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  life: number;
  fromPlayer: boolean;
}

export interface Room {
  x: number; y: number; w: number; h: number;
  cx: number; cy: number;
  kind: 'start' | 'normal' | 'boss' | 'treasure' | 'shop';
}

export interface DungeonState {
  tiles: Uint8Array;
  rooms: Room[];
  enemies: EnemyState[];
  items: ItemDrop[];
  floor: number;
  spawnX: number; spawnY: number;
  stairsX: number; stairsY: number;
  shopX: number; shopY: number;
  hasShop: boolean;
}
