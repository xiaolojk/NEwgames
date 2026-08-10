// 随机地牢生成器 · 橘子地牢
// BSP 房间-走廊算法 + 敌人/道具分布
// Orgc 橘子工作室

import { MAP_W, MAP_H, TILE_TYPE, ENEMY_TYPES } from '../config';
import type { DungeonState, Room, EnemyState, ItemDrop } from '../types';

let _idCounter = 1;
function nextId() { return _idCounter++; }

// 简单确定性随机
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 生成一层地牢
export function generateDungeon(floor: number, seed: number): DungeonState {
  const rng = mulberry32(seed);
  const tiles = new Uint8Array(MAP_W * MAP_H);
  // 初始全是墙
  tiles.fill(TILE_TYPE.WALL);

  const idx = (x: number, y: number) => y * MAP_W + x;
  const setTile = (x: number, y: number, t: number) => {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) tiles[idx(x, y)] = t;
  };
  const getTile = (x: number, y: number) => {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return TILE_TYPE.WALL;
    return tiles[idx(x, y)];
  };

  // 生成房间
  const rooms: Room[] = [];
  const targetRoomCount = 5 + Math.floor(rng() * 3) + Math.min(3, Math.floor(floor / 2));
  const minSize = 5;
  const maxSize = 9;
  const margin = 2;
  let attempts = 0;
  while (rooms.length < targetRoomCount && attempts < 200) {
    attempts++;
    const w = minSize + Math.floor(rng() * (maxSize - minSize + 1));
    const h = minSize + Math.floor(rng() * (maxSize - minSize + 1));
    const x = margin + Math.floor(rng() * (MAP_W - w - margin * 2));
    const y = margin + Math.floor(rng() * (MAP_H - h - margin * 2));
    const newRoom: Room = {
      x, y, w, h,
      cx: Math.floor(x + w / 2),
      cy: Math.floor(y + h / 2),
      id: rooms.length,
      visited: false,
      type: 'normal',
    };
    // 检查重叠（含 1 格 padding）
    let overlap = false;
    for (const r of rooms) {
      if (
        x - 1 < r.x + r.w && x + w + 1 > r.x &&
        y - 1 < r.y + r.h && y + h + 1 > r.y
      ) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;
    // 挖出房间
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        setTile(rx, ry, TILE_TYPE.FLOOR);
      }
    }
    rooms.push(newRoom);
  }

  if (rooms.length < 2) {
    // 兜底：强制至少 2 个房间
    const r1: Room = { x: 4, y: 4, w: 6, h: 6, cx: 7, cy: 7, id: 0, visited: false, type: 'normal' };
    const r2: Room = { x: 20, y: 16, w: 7, h: 7, cx: 23, cy: 19, id: 1, visited: false, type: 'normal' };
    for (let y = r1.y; y < r1.y + r1.h; y++) for (let x = r1.x; x < r1.x + r1.w; x++) setTile(x, y, TILE_TYPE.FLOOR);
    for (let y = r2.y; y < r2.y + r2.h; y++) for (let x = r2.x; x < r2.x + r2.w; x++) setTile(x, y, TILE_TYPE.FLOOR);
    rooms.length = 0;
    rooms.push(r1, r2);
  }

  // 连接房间：L 形走廊
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    // 随机决定先水平还是先垂直
    const hFirst = rng() > 0.5;
    const ax = a.cx, ay = a.cy, bx = b.cx, by = b.cy;
    if (hFirst) {
      carveCorridor(tiles, ax, ay, bx, ay, setTile);
      carveCorridor(tiles, bx, ay, bx, by, setTile);
    } else {
      carveCorridor(tiles, ax, ay, ax, by, setTile);
      carveCorridor(tiles, ax, by, bx, by, setTile);
    }
  }

  // 额外连接：随机连接 2 对不相邻房间，增加循环路径
  const extraConns = Math.floor(rooms.length / 3);
  for (let i = 0; i < extraConns; i++) {
    const a = rooms[Math.floor(rng() * rooms.length)];
    const b = rooms[Math.floor(rng() * rooms.length)];
    if (a.id === b.id) continue;
    carveCorridor(tiles, a.cx, a.cy, b.cx, a.cy, setTile);
    carveCorridor(tiles, b.cx, a.cy, b.cx, b.cy, setTile);
  }

  // 选起始房间（第一个）和 Boss 房间（距离起始最远的）
  const startRoom = rooms[0];
  let bossRoom = rooms[1];
  let maxDist = 0;
  for (const r of rooms) {
    if (r.id === 0) continue;
    const d = Math.abs(r.cx - startRoom.cx) + Math.abs(r.cy - startRoom.cy);
    if (d > maxDist) { maxDist = d; bossRoom = r; }
  }
  startRoom.type = 'start';
  bossRoom.type = 'boss';

  // 选 1-2 个宝箱房间
  const treasureRooms: Room[] = [];
  const candidates = rooms.filter(r => r.type === 'normal');
  const treasureCount = Math.min(candidates.length, 1 + Math.floor(rng() * 2));
  for (let i = 0; i < treasureCount; i++) {
    const idx2 = Math.floor(rng() * candidates.length);
    const r = candidates.splice(idx2, 1)[0];
    if (r) { r.type = 'treasure'; treasureRooms.push(r); }
  }

  // 放置楼梯（在 Boss 房间，因为击败 Boss 才能下楼）
  const stairsX = bossRoom.cx;
  const stairsY = bossRoom.cy;
  setTile(stairsX, stairsY, TILE_TYPE.STAIRS_DOWN);

  // 放置宝箱
  for (const r of treasureRooms) {
    setTile(r.cx, r.cy, TILE_TYPE.CHEST);
  }

  // 生成敌人
  const enemies: EnemyState[] = [];
  const enemyTypes = pickEnemyTypes(floor);
  const enemyCount = 4 + Math.floor(floor * 1.5) + Math.floor(rng() * 3);
  const startCx = startRoom.cx;
  const startCy = startRoom.cy;
  for (let i = 0; i < enemyCount; i++) {
    // 在非起始、非 Boss 房间随机位置生成
    // 关键：必须远离起始房间中心至少 8 瓦片，避免出生即被围攻
    let placed = false;
    for (let attempt = 0; attempt < 10 && !placed; attempt++) {
      const validRooms = rooms.filter(r => r.type === 'normal' || r.type === 'treasure');
      if (validRooms.length === 0) break;
      const r = validRooms[Math.floor(rng() * validRooms.length)];
      const ex = r.x + 1 + Math.floor(rng() * (r.w - 2));
      const ey = r.y + 1 + Math.floor(rng() * (r.h - 2));
      // 检查距离起始房间
      const distToStart = Math.abs(ex - startCx) + Math.abs(ey - startCy);
      if (distToStart < 10) continue;  // 至少 10 瓦片曼哈顿距离
      const typeKey = enemyTypes[Math.floor(rng() * enemyTypes.length)];
      const cfg = ENEMY_TYPES[typeKey];
      enemies.push({
        id: nextId(),
        type: typeKey,
        x: ex * 16 + 8,
        y: ey * 16 + 8,
        hp: cfg.hp + Math.floor(floor * 1.5),
        maxHp: cfg.hp + Math.floor(floor * 1.5),
        attack: cfg.attack + Math.floor(floor * 0.8),
        defense: cfg.defense,
        speed: cfg.speed,
        vx: 0, vy: 0,
        facing: 0,
        lastAttack: 0,
        hurtFlash: 0,
        alive: true,
        knockback: { x: 0, y: 0, t: 0 },
        ai: 'idle',
        wanderUntil: 0,
      });
      placed = true;
    }
  }

  // Boss 房间：每 3 层生成一个 Boss
  let bossEnemy: EnemyState | null = null;
  if (floor % 3 === 0) {
    const cfg = ENEMY_TYPES.boss1;
    bossEnemy = {
      id: nextId(),
      type: 'boss1',
      x: bossRoom.cx * 16 + 8,
      y: bossRoom.cy * 16 + 8,
      hp: cfg.hp + floor * 20,
      maxHp: cfg.hp + floor * 20,
      attack: cfg.attack + Math.floor(floor * 0.8),
      defense: cfg.defense,
      speed: cfg.speed,
      vx: 0, vy: 0,
      facing: 0,
      lastAttack: 0,
      hurtFlash: 0,
      alive: true,
      knockback: { x: 0, y: 0, t: 0 },
      ai: 'idle',
      wanderUntil: 0,
    };
    enemies.push(bossEnemy);
  }

  // 生成道具掉落（散落在房间内）
  const items: ItemDrop[] = [];
  const itemCount = 2 + Math.floor(rng() * 3);
  const itemPool = ['potion_hp', 'potion_hp', 'potion_sp', 'potion_str', 'potion_def', 'wood', 'iron'];
  for (let i = 0; i < itemCount; i++) {
    const validRooms = rooms.filter(r => r.type === 'normal' || r.type === 'treasure');
    if (validRooms.length === 0) break;
    const r = validRooms[Math.floor(rng() * validRooms.length)];
    const ix = r.x + 1 + Math.floor(rng() * (r.w - 2));
    const iy = r.y + 1 + Math.floor(rng() * (r.h - 2));
    const itemId = itemPool[Math.floor(rng() * itemPool.length)];
    items.push({
      id: nextId(),
      itemId,
      x: ix * 16 + 8,
      y: iy * 16 + 8,
      count: 1,
      vy: 0,
      pickupDelay: 0,
    });
  }

  // 起始房间放一瓶药水（保底）
  items.push({
    id: nextId(),
    itemId: 'potion_hp',
    x: startRoom.cx * 16 + 8,
    y: startRoom.cy * 16 + 8,
    count: 1,
    vy: 0,
    pickupDelay: 0,
  });

  return {
    floor,
    tiles,
    rooms,
    startRoom,
    bossRoom,
    treasureRooms,
    enemies,
    items,
    projectiles: [],
    spawnX: startRoom.cx * 16 + 8,
    spawnY: startRoom.cy * 16 + 8,
    stairsX,
    stairsY,
  };
}

function carveCorridor(
  tiles: Uint8Array,
  x1: number, y1: number, x2: number, y2: number,
  setTile: (x: number, y: number, t: number) => void,
) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let x = minX; x <= maxX; x++) {
    setTile(x, y1, TILE_TYPE.FLOOR);
    setTile(x, y1 - 1, TILE_TYPE.FLOOR);  // 走廊宽 2
  }
  for (let y = minY; y <= maxY; y++) {
    setTile(x2, y, TILE_TYPE.FLOOR);
    setTile(x2 - 1, y, TILE_TYPE.FLOOR);
  }
}

function pickEnemyTypes(floor: number): string[] {
  if (floor <= 2) return ['slime', 'slime', 'bat'];
  if (floor <= 4) return ['slime', 'skeleton', 'bat', 'bat'];
  if (floor <= 7) return ['skeleton', 'skeleton', 'bat', 'slime'];
  return ['skeleton', 'skeleton', 'bat', 'bat'];
}

// 检查某瓦片是否可通行
export function isWalkable(dungeon: DungeonState, px: number, py: number): boolean {
  const tx = Math.floor(px / 16);
  const ty = Math.floor(py / 16);
  if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false;
  const t = dungeon.tiles[ty * MAP_W + tx];
  return t === TILE_TYPE.FLOOR || t === TILE_TYPE.DOOR || t === TILE_TYPE.STAIRS_DOWN;
}

// 检查瓦片类型
export function tileAt(dungeon: DungeonState, tx: number, ty: number): number {
  if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return TILE_TYPE.WALL;
  return dungeon.tiles[ty * MAP_W + tx];
}
