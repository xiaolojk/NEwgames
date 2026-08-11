// 常量配置 · 赤焰地牢
export const TILE = 16;          // 瓦片像素
export const SCALE = 2.5;        // 全局缩放
export const TILE_PIX = TILE * SCALE; // 40
export const VIEW_W = 960;
export const VIEW_H = 600;

export const MAP_W = 60;
export const MAP_H = 44;

export const TILE_TYPE = {
  WALL: 0,
  FLOOR: 1,
  STAIRS: 2,
} as const;

export const COLORS = {
  wallDark:  0x140a1e,
  wallLight: 0x342050,
  floorA:    0x281838,
  floorB:    0x302044,
  floorC:    0x241430,
  floorD:    0x2c1a3c,
  stairs:    0x503080,
  stairsTop: 0x8060c0,
  player:    0xffd060,
  playerDark:0xc08020,
  sword:     0xe0e8ff,
  slash:     0xffffff,
  uiBg:      0x0a0610,
} as const;

// ============ 玩家初始属性 ============
export const PLAYER = {
  maxHp: 100,
  maxSp: 100,
  attack: 10,
  defense: 2,
  speed: 200,       // 像素/秒
  radius: 5 * SCALE, // 碰撞半径（圆形碰撞）
  attackCooldown: 0.32,  // 秒
  attackRange: 38 * SCALE,
  attackArc: 1.4,   // 弧度 (~80°)
  dashSpeed: 700,
  dashCost: 20,
  dashTime: 0.18,
  dashInvuln: 0.22,
  xpToLevel: (lv: number) => 40 + lv * lv * 12,
} as const;

// ============ 敌人类型 ============
export const ENEMY_TYPES: Record<string, {
  name: string;
  hp: number; atk: number; def: number; speed: number;
  radius: number; // 碰撞半径
  color: number; eyeColor: number;
  xp: number; gold: number;
  attackRange: number; attackCd: number;
}> = {
  slime: {
    name: '赤焰史莱姆', hp: 14, atk: 4, def: 0, speed: 55,
    radius: 4 * SCALE,
    color: 0xff4050, eyeColor: 0xffd0a0,
    xp: 6, gold: 3,
    attackRange: 18 * SCALE, attackCd: 1.0,
  },
  bat: {
    name: '暗影蝙蝠', hp: 10, atk: 5, def: 0, speed: 95,
    radius: 3.5 * SCALE,
    color: 0x6040a0, eyeColor: 0xff6060,
    xp: 5, gold: 2,
    attackRange: 16 * SCALE, attackCd: 0.75,
  },
  skeleton: {
    name: '骷髅战士', hp: 22, atk: 8, def: 2, speed: 70,
    radius: 4.5 * SCALE,
    color: 0xd0c8b0, eyeColor: 0xff4040,
    xp: 10, gold: 5,
    attackRange: 20 * SCALE, attackCd: 0.9,
  },
  demon: {
    name: '深渊恶魔', hp: 36, atk: 12, def: 3, speed: 80,
    radius: 5 * SCALE,
    color: 0x802040, eyeColor: 0xffa020,
    xp: 18, gold: 10,
    attackRange: 22 * SCALE, attackCd: 0.8,
  },
  boss: {
    name: '赤焰魔王', hp: 200, atk: 18, def: 6, speed: 60,
    radius: 7 * SCALE,
    color: 0xa00020, eyeColor: 0xffe040,
    xp: 80, gold: 60,
    attackRange: 26 * SCALE, attackCd: 0.7,
  },
};

// ============ 升级选项 ============
export const UPGRADES = [
  { id: 'hp',   name: '💖 生命强化',  desc: '最大生命 +30，立即回满' },
  { id: 'sp',   name: '💙 体力强化',  desc: '最大体力 +25，立即回满' },
  { id: 'atk',  name: '⚔ 攻击力强化', desc: '攻击力 +5' },
  { id: 'def',  name: '🛡 防御力强化', desc: '防御力 +4' },
  { id: 'spd',  name: '👟 速度强化',  desc: '移动速度 +15%' },
  { id: 'cd',   name: '⚡ 攻速强化',  desc: '攻击冷却 -20%' },
  { id: 'crit', name: '🔥 暴击强化',  desc: '暴击率 +10%，暴击伤害 +50%' },
  { id: 'dash', name: '💨 冲刺强化',  desc: '冲刺消耗 -30%，无敌帧 +40%' },
] as const;
