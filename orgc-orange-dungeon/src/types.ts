// 类型定义 · 橘子地牢

export type TileType = 1 | 2 | 3 | 4 | 5;
export type Direction = 0 | 1 | 2 | 3;

export interface Vec2 { x: number; y: number; }

export interface Room {
  x: number; y: number;
  w: number; h: number;
  cx: number; cy: number;
  id: number;
  visited: boolean;
  type: 'normal' | 'start' | 'boss' | 'treasure' | 'shop';
}

export interface EnemyState {
  id: number;
  type: string;
  x: number; y: number;
  hp: number; maxHp: number;
  attack: number; defense: number;
  speed: number;
  vx: number; vy: number;
  facing: Direction;
  lastAttack: number;
  hurtFlash: number;
  alive: boolean;
  knockback: { x: number; y: number; t: number };
  ai: 'idle' | 'chase' | 'attack' | 'wander';
  wanderTarget?: Vec2;
  wanderUntil: number;
  animTime: number;   // 动画累计时间（用于 90fps 平滑动画）
  animFrame: number;  // 当前动画帧
}

export interface ItemDrop {
  id: number;
  itemId: string;
  x: number; y: number;
  count: number;
  vy: number;
  pickupDelay: number;
}

export interface Projectile {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  life: number;
  fromPlayer: boolean;
}

export interface PlayerState {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  sp: number; maxSp: number;
  attack: number; defense: number;
  speed: number;
  level: number; xp: number; xpNext: number;
  gold: number;
  killCount: number;
  facing: Direction;
  attackCooldown: number;
  dashTime: number;
  dashDir: Vec2;
  hurtFlash: number;
  invuln: number;
  walkFrame: number;
  walkTime: number;
  attacking: boolean;
  attackTime: number;
  attackAngle: number;
}

export interface DungeonState {
  floor: number;
  tiles: Uint8Array;       // MAP_W * MAP_H
  rooms: Room[];
  startRoom: Room;
  bossRoom: Room;
  treasureRooms: Room[];
  shops: Array<{ x: number; y: number }>;
  enemies: EnemyState[];
  items: ItemDrop[];
  projectiles: Projectile[];
  spawnX: number; spawnY: number;
  stairsX: number; stairsY: number;
}
