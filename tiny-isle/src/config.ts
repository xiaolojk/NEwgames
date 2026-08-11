// 常量配置 · 小小岛 Tiny Isle
export const VIEW_W = 960;
export const VIEW_H = 640;

export const TILE = 32;
export const MAP_W = 30;
export const MAP_H = 20;

export const ISLE_CENTER = {
  x: VIEW_W * 0.5,
  y: VIEW_H * 0.55,
};
export const ISLE_RADIUS = Math.min(VIEW_W, VIEW_H) * 0.39; // 不规则基底半径

export const PLAYER = {
  speed: 210,
  radius: 14,
};

export const HARVEST = {
  tree: {
    name: '砍树',
    verb: 'CHOPPING',
    duration: 1.1,
    amountMin: 1,
    amountMax: 3,
    radius: 36, // 站在离树多远以内才算到达
  },
  rock: {
    name: '挖石',
    verb: 'MINING',
    duration: 1.5,
    amountMin: 1,
    amountMax: 2,
    radius: 34,
  },
};

export const BIOME = {
  WATER: 0,
  SAND: 1,
  GRASS: 2,
} as const;
export type Biome = (typeof BIOME)[keyof typeof BIOME];

export const COLORS = {
  oceanDeep: 0x5da8c6,
  oceanMid: 0x82c2da,
  oceanLite: 0xa6d8e6,
  foam: 0xe8f6fb,

  sand: 0xf2dcb0,
  sandDark: 0xe8c990,

  grassA: 0xbfe3a6,
  grassB: 0xa7d88c,
  grassC: 0x9ad088,

  trunk: 0x7b4a2a,
  trunkDark: 0x5c371e,
  leafA: 0x4f9e5b,
  leafB: 0x3f8a4f,
  leafLite: 0x7dbf86,

  stone: 0x8a8f99,
  stoneDark: 0x6b7079,
  stoneLite: 0xb2b8c3,

  woodDrop: 0xc28a52,
  stoneDrop: 0xb2b8c3,

  paper: 0xfbf5e7,
  ink: 0x2b2733,

  playerSkin: 0xf4c89c,
  playerShirt: 0xe67a5a,
  playerPants: 0x5a4a8a,
  playerHair: 0x3a2a1c,

  marker: 0xffffff,
};
