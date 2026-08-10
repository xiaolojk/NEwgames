// 游戏全局配置常量 · 橘子地牢
// Orgc 橘子工作室

export const TILE = 16;          // 像素瓦片尺寸
export const SCALE = 2;          // 显示缩放倍数
export const TILE_PIX = TILE * SCALE; // 屏幕瓦片像素 = 32
export const VIEW_W = 800;       // 视口宽度
export const VIEW_H = 600;       // 视口高度
export const MAP_W = 48;         // 地牢宽（瓦片数）
export const MAP_H = 36;         // 地牢高（瓦片数）

// 瓦片类型
export const TILE_TYPE = {
  WALL: 1,
  FLOOR: 2,
  DOOR: 3,
  STAIRS_DOWN: 4,
  CHEST: 5,
} as const;

// 方向枚举
export const DIR = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;

// 颜色调色板（暗黑地牢风）
export const COLORS = {
  // 地牢
  wallDark: 0x1a1018,
  wallLight: 0x3a2030,
  floorDark: 0x2a1820,
  floorLight: 0x4a2838,
  door: 0x8a5020,
  stairs: 0xffaa30,
  chest: 0xc08030,
  // 角色
  player: 0xff8030,
  playerHair: 0x4a2810,
  playerSkin: 0xf0c090,
  // 敌人
  slime: 0x40c050,
  skeleton: 0xe0e0d0,
  bat: 0x8040c0,
  bossRed: 0xc02030,
  // 道具
  potion: 0xe03040,
  gold: 0xffd030,
  sword: 0xc0c0d0,
  // 特效
  blood: 0xc02030,
  slash: 0xfff0c0,
  // HUD
  uiBg: 0x0a0710,
  uiAccent: 0xffaa30,
  uiText: 0xf0e8d0,
} as const;

// 玩家初始属性
export const PLAYER_BASE = {
  maxHp: 100,
  maxSp: 100,        // 体力（冲刺用）
  attack: 12,
  defense: 4,
  speed: 140,        // 像素/秒
  dashSpeed: 280,
  dashCost: 25,
  dashDuration: 0.18,
  attackRange: 28,
  attackCooldown: 0.32,
  attackArc: Math.PI * 0.6,
  xpToLevel: (lvl: number) => Math.floor(50 + lvl * 35 + lvl * lvl * 4),
};

// 敌人配置
export interface EnemyConfig {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  xp: number;
  gold: number;
  detectRange: number;
  attackRange: number;
  attackCooldown: number;
  color: number;
  isBoss?: boolean;
}

export const ENEMY_TYPES: Record<string, EnemyConfig> = {
  slime: {
    name: '绿色史莱姆', hp: 22, attack: 6, defense: 0,
    speed: 50, xp: 8, gold: 3, detectRange: 120, attackRange: 22,
    attackCooldown: 1.0, color: COLORS.slime,
  },
  skeleton: {
    name: '骷髅战士', hp: 38, attack: 10, defense: 2,
    speed: 80, xp: 15, gold: 6, detectRange: 160, attackRange: 26,
    attackCooldown: 0.8, color: COLORS.skeleton,
  },
  bat: {
    name: '吸血蝙蝠', hp: 18, attack: 8, defense: 0,
    speed: 130, xp: 12, gold: 4, detectRange: 200, attackRange: 22,
    attackCooldown: 0.6, color: COLORS.bat,
  },
  boss1: {
    name: '地牢守护者', hp: 280, attack: 18, defense: 6,
    speed: 70, xp: 200, gold: 80, detectRange: 400, attackRange: 36,
    attackCooldown: 1.2, color: COLORS.bossRed, isBoss: true,
  },
};

// 道具配置
export interface ItemConfig {
  id: string;
  name: string;
  icon: string;
  type: 'weapon' | 'potion' | 'material' | 'key';
  desc: string;
  stack: number;
  effect?: {
    heal?: number;
    healSp?: number;
    attackUp?: number;
    defenseUp?: number;
  };
}

export const ITEMS: Record<string, ItemConfig> = {
  potion_hp: {
    id: 'potion_hp', name: '生命药水', icon: '🧪', type: 'potion',
    desc: '恢复 40 点生命', stack: 9,
    effect: { heal: 40 },
  },
  potion_sp: {
    id: 'potion_sp', name: '体力药水', icon: '💙', type: 'potion',
    desc: '恢复 50 点体力', stack: 9,
    effect: { healSp: 50 },
  },
  potion_str: {
    id: 'potion_str', name: '力量药水', icon: '💪', type: 'potion',
    desc: '永久 +3 攻击力', stack: 9,
    effect: { attackUp: 3 },
  },
  potion_def: {
    id: 'potion_def', name: '防御药水', icon: '🛡️', type: 'potion',
    desc: '永久 +2 防御力', stack: 9,
    effect: { defenseUp: 2 },
  },
  wood: {
    id: 'wood', name: '木材', icon: '🪵', type: 'material',
    desc: '可制作弓箭', stack: 99,
  },
  iron: {
    id: 'iron', name: '铁矿', icon: '⛏️', type: 'material',
    desc: '可制作武器', stack: 99,
  },
  key: {
    id: 'key', name: '地牢钥匙', icon: '🗝️', type: 'key',
    desc: '可开启宝箱', stack: 9,
  },
};

// 升级选项
export const UPGRADES = [
  { id: 'hp', title: '强健体魄', desc: '最大生命 +30，并回满' },
  { id: 'atk', title: '锋利刀刃', desc: '攻击力 +4' },
  { id: 'def', title: '坚韧护甲', desc: '防御力 +3' },
  { id: 'spd', title: '迅捷步伐', desc: '移动速度 +15%' },
  { id: 'sp', title: '持久耐力', desc: '最大体力 +30，并回满' },
  { id: 'cooldown', title: '战斗节奏', desc: '攻击冷却 -15%' },
];

// ============ 商店商品 ============
export interface ShopItem {
  id: string;          // 物品 id（对应 ITEMS）或特殊武器 id
  name: string;
  icon: string;
  desc: string;
  price: number;
  type: 'potion' | 'weapon' | 'material' | 'key';
  // 武器特殊效果
  weaponEffect?: {
    attackUp?: number;
    defenseUp?: number;
    speedUp?: number;
    heal?: number;
  };
}

export const SHOP_ITEMS: ShopItem[] = [
  // 药水类
  { id: 'potion_hp', name: '生命药水', icon: '🧪', desc: '恢复 40 点生命', price: 15, type: 'potion' },
  { id: 'potion_sp', name: '体力药水', icon: '💙', desc: '恢复 50 点体力', price: 12, type: 'potion' },
  { id: 'potion_str', name: '力量药水', icon: '💪', desc: '永久 +3 攻击力', price: 40, type: 'potion' },
  { id: 'potion_def', name: '防御药水', icon: '🛡️', desc: '永久 +2 防御力', price: 35, type: 'potion' },
  // 武器类（一次性装备，立即生效）
  { id: 'wpn_dagger', name: '生锈匕首', icon: '🗡️', desc: '攻击力 +5', price: 30, type: 'weapon',
    weaponEffect: { attackUp: 5 } },
  { id: 'wpn_sword', name: '铁剑', icon: '⚔️', desc: '攻击力 +10', price: 60, type: 'weapon',
    weaponEffect: { attackUp: 10 } },
  { id: 'wpn_axe', name: '战斧', icon: '🪓', desc: '攻击力 +16', price: 100, type: 'weapon',
    weaponEffect: { attackUp: 16 } },
  { id: 'wpn_shield', name: '铁盾', icon: '🛡️', desc: '防御力 +6', price: 50, type: 'weapon',
    weaponEffect: { defenseUp: 6 } },
  { id: 'wpn_boots', name: '疾风靴', icon: '👟', desc: '移动速度 +20%', price: 45, type: 'weapon',
    weaponEffect: { speedUp: 0.2 } },
  { id: 'wpn_armor', name: '皮甲', icon: '🥋', desc: '防御力 +4，生命 +20', price: 70, type: 'weapon',
    weaponEffect: { defenseUp: 4, heal: 20 } },
  // 材料/钥匙
  { id: 'key', name: '地牢钥匙', icon: '🗝️', desc: '可开启宝箱', price: 25, type: 'key' },
];
