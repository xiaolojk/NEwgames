import {
  GameState,
  Tile,
  TileState,
  FARM_COLS,
  FARM_ROWS,
  Season,
  Weather,
} from '../types/game';

const STORAGE_KEY = 'stardew-mobile-save-v1';

export function createInitialTiles(): Tile[][] {
  const tiles: Tile[][] = [];
  for (let r = 0; r < FARM_ROWS; r++) {
    tiles[r] = [];
    for (let c = 0; c < FARM_COLS; c++) {
      tiles[r][c] = {
        state: TileState.GRASS,
        stage: 0,
        growthProgress: 0,
        waterCount: 0,
        wetToday: false,
      };
    }
  }
  // 预留中心区域为已翻地，方便新手
  for (let r = 2; r <= 4; r++) {
    for (let c = 3; c <= 5; c++) {
      tiles[r][c].state = TileState.TILLED;
    }
  }
  return tiles;
}

export function createInitialState(): GameState {
  return {
    money: 500,
    energy: 100,
    maxEnergy: 100,
    day: 1,
    season: 'spring',
    year: 1,
    timeOfDay: 6.0, // 6:00 AM
    weather: 'sunny',
    selectedTool: 'hoe',
    selectedSeed: 'parsnip',
    inventory: {},
    seeds: {
      parsnip: 15, // 初始赠送防风草种子
    },
    tiles: createInitialTiles(),
  };
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed && parsed.tiles) return parsed;
    return null;
  } catch (_) {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];

export function nextSeason(s: Season): Season {
  const i = SEASONS.indexOf(s);
  return SEASONS[(i + 1) % 4];
}

export function randomWeather(season: Season): Weather {
  const r = Math.random();
  if (season === 'winter') {
    return r < 0.35 ? 'rainy' : 'sunny';
  }
  if (season === 'spring' || season === 'fall') {
    if (r < 0.25) return 'rainy';
    if (r < 0.4) return 'cloudy';
    return 'sunny';
  }
  // summer
  if (r < 0.12) return 'rainy';
  return 'sunny';
}

export const SEASON_INFO: Record<Season, { name: string; color: string; bg: number; tint: number }> = {
  spring: { name: '春', color: '#ffb7c5', bg: 0xfff5c2, tint: 0xdfffe6 },
  summer: { name: '夏', color: '#ff8c00', bg: 0xfffde7, tint: 0xe3ffe0 },
  fall:   { name: '秋', color: '#c0392b', bg: 0xffecb3, tint: 0xfff1d6 },
  winter: { name: '冬', color: '#2980b9', bg: 0xe8f5fd, tint: 0xf5fbff },
};

export function formatTime(t: number): string {
  // 6.0 = 6:00 AM, 12.0 = 12:00 PM, 18.0 = 6:00 PM, 26.0 = 2:00 AM next day
  const display = t % 24;
  const h = Math.floor(display);
  const m = Math.floor((display - h) * 60);
  const mm = m.toString().padStart(2, '0');
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${mm} ${ampm}`;
}

export function canPlantInSeason(cropSeasons: Season[], current: Season): boolean {
  return cropSeasons.includes(current);
}
