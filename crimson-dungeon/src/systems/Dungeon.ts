// 地牢生成 · 赤焰地牢
// BSP 房间+走廊算法，保证出生点安全
import { MAP_W, MAP_H, TILE_PIX, TILE_TYPE, ENEMY_TYPES } from '../config';
import type { DungeonState, Room, EnemyState, ItemDrop } from '../types';
import { tileToWorld } from './Collision';

let _eid = 1;
const nextEid = () => _eid++;

// 确定性随机（种子）
function rngMulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDungeon(floor: number, seed: number): DungeonState {
  const rand = rngMulberry32(seed);
  const tiles = new Uint8Array(MAP_W * MAP_H);
  tiles.fill(TILE_TYPE.WALL);
  const idx = (x: number, y: number) => y * MAP_W + x;

  const rooms: Room[] = [];
  const wantRooms = 5 + Math.floor(rand() * 3) + Math.min(3, Math.floor(floor / 2));
  const minS = 5, maxS = 10;
  const margin = 2;

  for (let attempt = 0; attempt < 300 && rooms.length < wantRooms; attempt++) {
    const w = minS + Math.floor(rand() * (maxS - minS + 1));
    const h = minS + Math.floor(rand() * (maxS - minS + 1));
    const x = margin + Math.floor(rand() * (MAP_W - w - margin * 2));
    const y = margin + Math.floor(rand() * (MAP_H - h - margin * 2));
    // 检查重叠（含 1 格 padding，避免房间贴墙）
    let overlap = false;
    for (const r of rooms) {
      if (x - 1 < r.x + r.w && x + w + 1 > r.x &&
          y - 1 < r.y + r.h && y + h + 1 > r.y) {
        overlap = true; break;
      }
    }
    if (overlap) continue;
    // 挖
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        tiles[idx(xx, yy)] = TILE_TYPE.FLOOR;
    rooms.push({
      x, y, w, h,
      cx: Math.floor(x + w / 2),
      cy: Math.floor(y + h / 2),
      kind: 'normal',
    });
  }

  // 兜底至少 2 个房间
  if (rooms.length < 2) {
    const r1: Room = { x: 5, y: 5, w: 7, h: 7, cx: 8, cy: 8, kind: 'normal' };
    const r2: Room = { x: 24, y: 20, w: 8, h: 8, cx: 28, cy: 24, kind: 'normal' };
    const carve = (r: Room) => {
      for (let yy = r.y; yy < r.y + r.h; yy++)
        for (let xx = r.x; xx < r.x + r.w; xx++)
          tiles[idx(xx, yy)] = TILE_TYPE.FLOOR;
    };
    carve(r1); carve(r2);
    rooms.length = 0; rooms.push(r1, r2);
  }

  // 连接房间（L 形走廊，宽度 2）
  const carve2 = (x1: number, y1: number, x2: number, y2: number) => {
    const a = (x: number, y: number) => {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        tiles[idx(x, y)] = TILE_TYPE.FLOOR;
      }
    };
    // 先水平后垂直或反过来（随机）
    if (rand() < 0.5) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { a(x, y1); a(x, y1 - 1); }
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { a(x2, y); a(x2 - 1, y); }
    } else {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { a(x1, y); a(x1 - 1, y); }
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { a(x, y2); a(x, y2 - 1); }
    }
  };

  for (let i = 1; i < rooms.length; i++) {
    carve2(rooms[i - 1].cx, rooms[i - 1].cy, rooms[i].cx, rooms[i].cy);
  }
  // 额外连接
  const extra = Math.floor(rooms.length / 3);
  for (let i = 0; i < extra; i++) {
    const a = rooms[Math.floor(rand() * rooms.length)];
    const b = rooms[Math.floor(rand() * rooms.length)];
    if (a === b) continue;
    carve2(a.cx, a.cy, b.cx, b.cy);
  }

  // 分配房间类型
  rooms[0].kind = 'start';
  // Boss 房：距离起点最远
  let best = 1, bestD = -1;
  for (let i = 1; i < rooms.length; i++) {
    const d = Math.abs(rooms[i].cx - rooms[0].cx) + Math.abs(rooms[i].cy - rooms[0].cy);
    if (d > bestD) { bestD = d; best = i; }
  }
  rooms[best].kind = 'boss';
  // 宝箱房 & 商店
  const candidates = rooms.filter(r => r.kind === 'normal');
  for (let i = 0; i < 1 + Math.floor(rand() * 2) && candidates.length > 0; i++) {
    const pick = candidates.splice(Math.floor(rand() * candidates.length), 1)[0];
    pick.kind = 'treasure';
  }
  let shopX = -1, shopY = -1;
  if (candidates.length > 0 && floor > 0) {
    const pick = candidates.splice(Math.floor(rand() * candidates.length), 1)[0];
    pick.kind = 'shop';
    shopX = pick.cx; shopY = pick.cy;
  }

  // 楼梯在 Boss 房中心
  tiles[idx(rooms[best].cx, rooms[best].cy)] = TILE_TYPE.STAIRS;

  // ===== 生成敌人 =====
  const enemies: EnemyState[] = [];
  const enemyPool: string[] = (() => {
    if (floor <= 2) return ['slime', 'slime', 'bat'];
    if (floor <= 5) return ['slime', 'skeleton', 'bat', 'bat'];
    if (floor <= 9) return ['skeleton', 'skeleton', 'bat', 'demon'];
    return ['skeleton', 'demon', 'demon', 'bat'];
  })();

  const enemyCount = 4 + Math.floor(floor * 1.5) + Math.floor(rand() * 3);
  const startCx = rooms[0].cx, startCy = rooms[0].cy;

  for (let i = 0; i < enemyCount; i++) {
    const validRooms = rooms.filter(r => r.kind === 'normal' || r.kind === 'treasure');
    if (validRooms.length === 0) break;
    for (let try2 = 0; try2 < 12; try2++) {
      const r = validRooms[Math.floor(rand() * validRooms.length)];
      const ex = r.x + 1 + Math.floor(rand() * (r.w - 2));
      const ey = r.y + 1 + Math.floor(rand() * (r.h - 2));
      const distStart = Math.abs(ex - startCx) + Math.abs(ey - startCy);
      if (distStart < 10) continue; // 至少 10 格远离出生点，安全出生！
      const type = enemyPool[Math.floor(rand() * enemyPool.length)];
      const cfg = ENEMY_TYPES[type];
      const worldPos = tileToWorld(ex, ey);
      enemies.push({
        id: nextEid(),
        type,
        x: worldPos.x, y: worldPos.y,
        vx: 0, vy: 0,
        hp: cfg.hp + Math.floor(floor * 2.5),
        maxHp: cfg.hp + Math.floor(floor * 2.5),
        atk: cfg.atk + Math.floor(floor * 1.2),
        def: cfg.def,
        speed: cfg.speed,
        radius: cfg.radius,
        alive: true,
        hurtFlash: 0,
        kbX: 0, kbY: 0, kbT: 0,
        lastAtk: 0,
        animTime: 0, animFrame: 0,
        aggro: false,
      });
      break;
    }
  }

  // Boss：每 3 层一只
  if (floor % 3 === 0) {
    const cfg = ENEMY_TYPES.boss;
    const worldPos = tileToWorld(rooms[best].cx, rooms[best].cy);
    enemies.push({
      id: nextEid(),
      type: 'boss',
      x: worldPos.x, y: worldPos.y,
      vx: 0, vy: 0,
      hp: cfg.hp + floor * 30,
      maxHp: cfg.hp + floor * 30,
      atk: cfg.atk + Math.floor(floor * 1.5),
      def: cfg.def + Math.floor(floor / 2),
      speed: cfg.speed,
      radius: cfg.radius,
      alive: true,
      hurtFlash: 0,
      kbX: 0, kbY: 0, kbT: 0,
      lastAtk: 0,
      animTime: 0, animFrame: 0,
      aggro: true, // Boss 全程激活
    });
  }

  // ===== 道具掉落 =====
  const items: ItemDrop[] = [];
  const itemKinds: Array<'hp' | 'sp' | 'gold'> = ['hp', 'hp', 'sp', 'gold', 'gold'];
  for (let i = 0; i < 2 + Math.floor(rand() * 3); i++) {
    const valid = rooms.filter(r => r.kind === 'normal' || r.kind === 'treasure');
    if (valid.length === 0) break;
    const r = valid[Math.floor(rand() * valid.length)];
    const ix = r.x + 1 + Math.floor(rand() * (r.w - 2));
    const iy = r.y + 1 + Math.floor(rand() * (r.h - 2));
    const worldPos = tileToWorld(ix, iy);
    items.push({
      id: nextEid(),
      kind: itemKinds[Math.floor(rand() * itemKinds.length)],
      x: worldPos.x, y: worldPos.y,
      amount: 1,
      vy: 0,
    });
  }
  // 出生点保底药水
  const sp = tileToWorld(rooms[0].cx + 1, rooms[0].cy);
  items.push({ id: nextEid(), kind: 'hp', x: sp.x, y: sp.y, amount: 1, vy: 0 });
  items.push({ id: nextEid(), kind: 'sp', x: sp.x + TILE_PIX, y: sp.y, amount: 1, vy: 0 });

  // 宝箱：额外道具
  for (const r of rooms) {
    if (r.kind !== 'treasure') continue;
    const worldPos = tileToWorld(r.cx, r.cy);
    items.push({ id: nextEid(), kind: 'gold', x: worldPos.x, y: worldPos.y, amount: 10 + Math.floor(rand() * 15), vy: 0 });
    items.push({ id: nextEid(), kind: 'hp', x: worldPos.x + 10, y: worldPos.y + 10, amount: 2, vy: 0 });
  }

  const start = tileToWorld(rooms[0].cx, rooms[0].cy);
  const stairs = tileToWorld(rooms[best].cx, rooms[best].cy);
  const shopWp = shopX >= 0 ? tileToWorld(shopX, shopY) : { x: -1, y: -1 };

  return {
    tiles, rooms, enemies, items,
    floor,
    spawnX: start.x, spawnY: start.y,
    stairsX: stairs.x, stairsY: stairs.y,
    shopX: shopWp.x, shopY: shopWp.y,
    hasShop: shopX >= 0,
  };
}
