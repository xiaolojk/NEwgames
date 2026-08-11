// 游戏纯逻辑状态 · 小小岛 Tiny Isle
// 不依赖 Phaser。渲染在 GameScene 做。
import { MAP_W, MAP_H, BIOME, type Biome, ISLE_CENTER, PLAYER, HARVEST, VIEW_W, VIEW_H } from '../config';

export interface Tile {
  biome: Biome;
  elevation: number; // 0~1 噪声
  // 0=deep water, 1=shore, 2=sand, 3=grass near sand, 4=grass core
  zone: number;
}

export interface Resource {
  id: number;
  type: 'tree' | 'rock';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  shake: number; // 敲击抖动（视觉）
  harvestT: number; // 采集进度 0~1
}

export interface GameState {
  tiles: Uint8Array; // BIOME 编码（方便存）
  zones: Uint8Array;
  elevation: Float32Array;
  resources: Resource[];
  player: {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    moving: boolean;
    walkT: number; // 走路动画
  };
  inventory: { wood: number; stone: number };
  // 当前点击意图：走到目标点后要做什么
  intent:
    | { kind: 'walk' }
    | { kind: 'harvest'; resourceId: number };
  harvestProgress: number; // 0~1
  harvesting: boolean;
  harvestTargetId: number | null;
}

// =============== 确定性随机 / 简易噪声 ===============
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D value noise，简单平滑
function makeNoise(seed: number) {
  const rand = mulberry32(seed);
  const N = 256;
  const perm = new Uint8Array(N * 2);
  const grad = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    perm[i] = i;
    grad[i] = rand() * 2 - 1;
  }
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < N; i++) perm[N + i] = perm[i];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = grad[perm[perm[xi] + yi]];
    const ab = grad[perm[perm[xi] + yi + 1]];
    const ba = grad[perm[perm[xi + 1] + yi]];
    const bb = grad[perm[perm[xi + 1] + yi + 1]];
    const x1 = aa + (ba - aa) * u;
    const x2 = ab + (bb - ab) * u;
    return (x1 + (x2 - x1) * v + 1) * 0.5;
  };
}

function fbm(n2: (x: number, y: number) => number, x: number, y: number): number {
  let total = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < 4; o++) {
    total += n2(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / norm;
}

let rid = 1;

export function createGameState(seed = Date.now() & 0xffffffff): GameState {
  const n2 = makeNoise(seed || 1);
  const rand = mulberry32((seed * 131) || 7);

  const tiles = new Uint8Array(MAP_W * MAP_H);
  const zones = new Uint8Array(MAP_W * MAP_H);
  const elevation = new Float32Array(MAP_W * MAP_H);

  // 先做不规则小岛
  const cx = MAP_W * 0.5;
  const cy = MAP_H * 0.52;
  const baseR = Math.min(MAP_W, MAP_H) * 0.43; // 地图瓦片半径
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const idx = y * MAP_W + x;
      // 噪声化半径边界（不规则）
      const nx = x / MAP_W - 0.5;
      const ny = y / MAP_H - 0.52;
      const angle = Math.atan2(ny, nx);
      const wobble =
        0.32 * fbm(n2, x * 0.18, y * 0.18) +
        0.18 * Math.sin(angle * 3.2 + seed * 0.001) +
        0.12 * Math.cos(angle * 5.3 - seed * 0.002);
      const isoRadius = baseR * (0.88 + 0.34 * wobble);
      const dx = x - cx;
      const dy = (y - cy) * (MAP_W / MAP_H); // 校正宽高比
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elevRaw = 1 - dist / isoRadius; // >0 岛上
      const elev = Math.max(0, Math.min(1, elevRaw));
      elevation[idx] = elev;

      let biome: Biome = BIOME.WATER;
      let zone = 0;
      if (elev > 0.08) {
        biome = BIOME.SAND;
        zone = elev > 0.16 ? 2 : 1; // 1=wet sand/shore, 2=dry sand
      }
      if (elev > 0.22) {
        biome = BIOME.GRASS;
        zone = elev > 0.55 ? 4 : 3; // 3=sand-grass过渡, 4=核心草地
      }
      tiles[idx] = biome;
      zones[idx] = zone;
    }
  }

  // ============== 撒资源（树/石头）==============
  const resources: Resource[] = [];
  // 树：只在 zone 3/4（草地），不要太靠中心太密
  const treeCount = 28 + Math.floor(rand() * 6);
  const rockCount = 12 + Math.floor(rand() * 5);
  const worldW = MAP_W * TILE_SCALE();
  const worldH = MAP_H * TILE_SCALE();
  const tileSize = worldW / MAP_W;

  function randTileInZone(zSet: Set<number>): { wx: number; wy: number } | null {
    for (let try2 = 0; try2 < 60; try2++) {
      const x = 1 + Math.floor(rand() * (MAP_W - 2));
      const y = 1 + Math.floor(rand() * (MAP_H - 2));
      const z = zones[y * MAP_W + x];
      if (!zSet.has(z)) continue;
      // 再检查资源距离，避免叠
      const wx = x * tileSize + tileSize * 0.5 + (rand() - 0.5) * tileSize * 0.4;
      const wy = y * tileSize + tileSize * 0.5 + (rand() - 0.5) * tileSize * 0.4;
      let ok = true;
      for (const r of resources) {
        const ddx = r.x - wx, ddy = r.y - wy;
        if (ddx * ddx + ddy * ddy < 52 * 52) { ok = false; break; }
      }
      if (!ok) continue;
      return { wx, wy };
    }
    return null;
  }
  for (let i = 0; i < treeCount; i++) {
    const p = randTileInZone(new Set([3, 4]));
    if (!p) continue;
    resources.push({
      id: rid++,
      type: 'tree',
      x: p.wx, y: p.wy,
      hp: 3, maxHp: 3,
      alive: true,
      shake: 0, harvestT: 0,
    });
  }
  for (let i = 0; i < rockCount; i++) {
    // 石头 zone 2/3：沙滩边和草地上都有
    const p = randTileInZone(new Set([2, 3, 4]));
    if (!p) continue;
    resources.push({
      id: rid++,
      type: 'rock',
      x: p.wx, y: p.wy,
      hp: 4, maxHp: 4,
      alive: true,
      shake: 0, harvestT: 0,
    });
  }

  // ============== 玩家出生点：岛上任意草地中心点 =============
  let px = ISLE_CENTER.x;
  let py = ISLE_CENTER.y;
  for (let try2 = 0; try2 < 100; try2++) {
    const tx = Math.floor(cx);
    const ty = Math.floor(cy);
    const idx = ty * MAP_W + tx;
    if (zones[idx] >= 3) {
      px = tx * tileSize + tileSize * 0.5;
      py = ty * tileSize + tileSize * 0.5;
      break;
    }
  }

  return {
    tiles, zones, elevation,
    resources,
    player: { x: px, y: py, targetX: px, targetY: py, moving: false, walkT: 0 },
    inventory: { wood: 0, stone: 0 },
    intent: { kind: 'walk' },
    harvestProgress: 0,
    harvesting: false,
    harvestTargetId: null,
  };
}

// 每瓦片 → 世界像素换算：把 MAP_W x MAP_H 的瓦片图刚好铺进 VIEW
// 留 40 px 海水边
function TILE_SCALE(): number {
  const pad = 60;
  return Math.min((VIEW_W - pad * 2) / MAP_W, (VIEW_H - pad * 2) / MAP_H);
}

export function tileSizePx(): number {
  return TILE_SCALE();
}

export function tileToWorld(tx: number, ty: number): { x: number; y: number } {
  const pad = 60;
  const s = TILE_SCALE();
  return {
    x: pad + tx * s + s * 0.5,
    y: pad + ty * s + s * 0.5,
  };
}

export function isLand(gs: GameState, wx: number, wy: number): boolean {
  const pad = 60;
  const tsc = TILE_SCALE();
  const tx = Math.floor((wx - pad) / tsc);
  const ty = Math.floor((wy - pad) / tsc);
  if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false;
  return gs.tiles[ty * MAP_W + tx] !== BIOME.WATER;
}

// 资源实体的阻挡半径（走路不要穿进去）
export const RES_RADIUS = {
  tree: 22,
  rock: 20,
};

// 找离 (wx, wy) 最近的资源（点击命中）
export function resourceAt(s: GameState, wx: number, wy: number, radius = 28): Resource | null {
  let best: Resource | null = null;
  let bestD = Infinity;
  for (const r of s.resources) {
    if (!r.alive) continue;
    const dx = r.x - wx, dy = r.y - wy;
    const d2 = dx * dx + dy * dy;
    const hitR = r.type === 'tree' ? 34 : 30;
    if (d2 < (radius + hitR) * (radius + hitR) && d2 < bestD) {
      bestD = d2;
      best = r;
    }
  }
  return best;
}

// ============= 点击驱动 =============
export function setIntentWalk(s: GameState, wx: number, wy: number) {
  // 不要走到水里：夹到最近陆地（简化：如果点击水，就取朝玩家方向的最近陆地投影）
  const land = isLand(s, wx, wy);
  let tx = wx, ty = wy;
  if (!land) {
    // 往玩家方向回拉，直到碰到陆地
    const ox = s.player.x, oy = s.player.y;
    for (let k = 0.98; k > 0.05; k -= 0.02) {
      const px = ox + (wx - ox) * k;
      const py = oy + (wy - oy) * k;
      if (isLand(s, px, py)) { tx = px; ty = py; break; }
    }
  }
  s.player.targetX = tx;
  s.player.targetY = ty;
  s.player.moving = true;
  s.intent = { kind: 'walk' };
  s.harvesting = false;
  s.harvestTargetId = null;
}

export function setIntentHarvest(s: GameState, r: Resource) {
  // 目标：走到资源附近
  const cfg = HARVEST[r.type];
  s.player.targetX = r.x;
  s.player.targetY = r.y;
  s.player.moving = true;
  s.intent = { kind: 'harvest', resourceId: r.id };
  s.harvesting = false;
  s.harvestTargetId = null;
  void cfg;
}

// ============= 更新循环 =============
export function stepGame(s: GameState, dt: number, callbacks: {
  onHarvestTick?: (pct: number, label: string) => void;
  onHarvestEnd?: (r: Resource, amount: number) => void;
  onResourceDestroyed?: (r: Resource) => void;
  clearProgress?: () => void;
}) {
  const p = s.player;

  // 资源抖动衰减
  for (const r of s.resources) if (r.shake > 0) r.shake = Math.max(0, r.shake - dt * 6);

  // 正在采集
  if (s.harvesting && s.harvestTargetId != null) {
    const r = s.resources.find(rr => rr.id === s.harvestTargetId && rr.alive);
    if (!r) {
      s.harvesting = false;
      s.harvestTargetId = null;
      callbacks.clearProgress?.();
    } else {
      const cfg = HARVEST[r.type];
      s.harvestProgress = Math.min(1, s.harvestProgress + dt / cfg.duration);
      // 进度到了：+1 resource hp，重置进度直到资源死掉
      if (s.harvestProgress >= 1) {
        s.harvestProgress = 0;
        r.hp -= 1;
        r.shake = 1;
        if (r.hp <= 0) {
          r.alive = false;
          const amt = cfg.amountMin + Math.floor(Math.random() * (cfg.amountMax - cfg.amountMin + 1));
          if (r.type === 'tree') s.inventory.wood += amt;
          else s.inventory.stone += amt;
          s.harvesting = false;
          s.harvestTargetId = null;
          callbacks.onResourceDestroyed?.(r);
          callbacks.onHarvestEnd?.(r, amt);
          callbacks.clearProgress?.();
        } else {
          callbacks.onHarvestTick?.(0, cfg.verb); // 轻击
        }
      } else {
        callbacks.onHarvestTick?.(s.harvestProgress, cfg.verb);
      }
    }
    return;
  }

  if (!p.moving) return;

  // 走路
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1.6 * 1.6) {
    p.x = p.targetX;
    p.y = p.targetY;
    p.moving = false;
    p.walkT = 0;
    // 到达意图点
    if (s.intent.kind === 'harvest') {
      const r = s.resources.find(rr => rr.id === (s.intent as any).resourceId && rr.alive);
      const cfg = r ? HARVEST[r.type] : null;
      if (r && cfg) {
        s.harvesting = true;
        s.harvestTargetId = r.id;
        s.harvestProgress = 0;
        callbacks.onHarvestTick?.(0, cfg.verb);
      }
    }
    return;
  }
  const d = Math.sqrt(d2);
  let step = PLAYER.speed * dt;

  // 判断是否接近 harvest 资源的可交互半径
  if (s.intent.kind === 'harvest') {
    const r = s.resources.find(rr => rr.id === (s.intent as any).resourceId && rr.alive);
    const cfg = r ? HARVEST[r.type] : null;
    if (r && cfg) {
      const rdx = r.x - p.x, rdy = r.y - p.y;
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
      const stopDist = cfg.radius;
      if (rdist <= stopDist) {
        // 停止，开始采集
        p.moving = false;
        p.walkT = 0;
        s.harvesting = true;
        s.harvestTargetId = r.id;
        s.harvestProgress = 0;
        callbacks.onHarvestTick?.(0, cfg.verb);
        return;
      }
    } else {
      // 资源死掉了：改成走过去
      s.intent = { kind: 'walk' };
    }
  }

  step = Math.min(step, d);
  const nx = p.x + (dx / d) * step;
  const ny = p.y + (dy / d) * step;

  // 碰撞：陆地 + 资源避让（圆形）
  let finalX = nx;
  let finalY = ny;
  const pr = PLAYER.radius;
  if (!isLand(s, finalX, finalY)) {
    // 逐轴回退
    if (isLand(s, nx, p.y)) finalY = p.y;
    else if (isLand(s, p.x, ny)) finalX = p.x;
    else { finalX = p.x; finalY = p.y; p.moving = false; }
  }
  // 资源避让：把玩家推离资源圆
  for (const r of s.resources) {
    if (!r.alive) continue;
    const rr = RES_RADIUS[r.type];
    const ddx = finalX - r.x;
    const ddy = finalY - r.y;
    const dist2 = ddx * ddx + ddy * ddy;
    const minD = rr + pr * 0.75;
    if (dist2 < minD * minD) {
      const dist = Math.sqrt(dist2) || 0.001;
      const push = (minD - dist);
      finalX += (ddx / dist) * push;
      finalY += (ddy / dist) * push;
    }
  }
  // 再保险：推离后仍在水 → 放弃
  if (!isLand(s, finalX, finalY)) {
    finalX = p.x;
    finalY = p.y;
  }
  p.x = finalX;
  p.y = finalY;
  p.walkT += dt * 9;
}
