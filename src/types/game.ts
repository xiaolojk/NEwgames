export const TILE_SIZE = 64;
export const FARM_COLS = 9;
export const FARM_ROWS = 7;

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Weather = 'sunny' | 'rainy' | 'cloudy';

// 土壤状态
export enum TileState {
  GRASS = 0,       // 草地（未开垦）
  TILLED = 1,      // 已翻地
  SEEDED = 2,      // 已播种
  WATERED = 3,     // 已浇水+有种子
  GROWING = 4,     // 生长中
  READY = 5,       // 可收获
}

// 作物生长阶段
export type CropStage = 0 | 1 | 2 | 3 | 4;

export interface CropType {
  id: string;
  name: string;
  emoji: string;
  color: number;
  seedPrice: number;
  sellPrice: number;
  growthDays: number;
  season: Season[];
  waterNeeded: number; // 总需浇水天数
}

export const CROPS: Record<string, CropType> = {
  parsnip: {
    id: 'parsnip',
    name: '防风草',
    emoji: '🥕',
    color: 0xffe4b5,
    seedPrice: 20,
    sellPrice: 35,
    growthDays: 4,
    season: ['spring'],
    waterNeeded: 3,
  },
  potato: {
    id: 'potato',
    name: '土豆',
    emoji: '🥔',
    color: 0xd2b48c,
    seedPrice: 50,
    sellPrice: 80,
    growthDays: 6,
    season: ['spring'],
    waterNeeded: 4,
  },
  strawberry: {
    id: 'strawberry',
    name: '草莓',
    emoji: '🍓',
    color: 0xff5252,
    seedPrice: 120,
    sellPrice: 200,
    growthDays: 8,
    season: ['spring'],
    waterNeeded: 5,
  },
  blueberry: {
    id: 'blueberry',
    name: '蓝莓',
    emoji: '🫐',
    color: 0x4169e1,
    seedPrice: 80,
    sellPrice: 150,
    growthDays: 13,
    season: ['summer'],
    waterNeeded: 8,
  },
  tomato: {
    id: 'tomato',
    name: '番茄',
    emoji: '🍅',
    color: 0xff6347,
    seedPrice: 50,
    sellPrice: 90,
    growthDays: 11,
    season: ['summer'],
    waterNeeded: 6,
  },
  corn: {
    id: 'corn',
    name: '玉米',
    emoji: '🌽',
    color: 0xffd700,
    seedPrice: 150,
    sellPrice: 260,
    growthDays: 14,
    season: ['summer', 'fall'],
    waterNeeded: 8,
  },
  pumpkin: {
    id: 'pumpkin',
    name: '南瓜',
    emoji: '🎃',
    color: 0xff8c00,
    seedPrice: 100,
    sellPrice: 320,
    growthDays: 13,
    season: ['fall'],
    waterNeeded: 7,
  },
  cranberry: {
    id: 'cranberry',
    name: '蔓越莓',
    emoji: '🫐',
    color: 0xc71585,
    seedPrice: 240,
    sellPrice: 420,
    growthDays: 7,
    season: ['fall'],
    waterNeeded: 4,
  },
};

// 工具类型
export type ToolType =
  | 'hoe'      // 锄头 - 翻地
  | 'can'      // 水壶 - 浇水
  | 'axe'      // 斧头 - 砍草/树
  | 'seed'     // 种子选择
  | 'hand';    // 空手 - 收获/拾取

export interface Tile {
  state: TileState;
  cropId?: string;           // 种植的作物ID
  stage: CropStage;          // 生长阶段
  growthProgress: number;    // 0~100 生长进度
  waterCount: number;        // 已浇水次数
  wetToday: boolean;         // 今天是否浇过水
}

export interface GameState {
  money: number;
  energy: number;
  maxEnergy: number;
  day: number;
  season: Season;
  year: number;
  timeOfDay: number;   // 6.0 ~ 26.0 (6am 到 次日2am)
  weather: Weather;
  selectedTool: ToolType;
  selectedSeed: string;
  inventory: Record<string, number>; // 物品id -> 数量
  seeds: Record<string, number>;     // 种子id -> 数量
  tiles: Tile[][];
}
