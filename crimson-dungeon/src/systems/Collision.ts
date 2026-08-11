// 碰撞与移动系统 · 赤焰地牢
// 圆形碰撞 + 分轴滑动。第一天就正确！
import { MAP_W, MAP_H, TILE_PIX, TILE_TYPE } from '../config';
import type { DungeonState } from '../types';

// 圆形碰撞：检查圆（中心 cx,cy 半径 r）是否撞到墙
// 只检查 5 个点（中心 + 4 正方向），故意不加对角线，避免走廊拐角误判
export function circleHitsWall(
  d: DungeonState, cx: number, cy: number, r: number,
): boolean {
  const checks: Array<[number, number]> = [
    [cx, cy],           // 中心
    [cx + r, cy],       // 右
    [cx - r, cy],       // 左
    [cx, cy + r],       // 下
    [cx, cy - r],       // 上
  ];
  for (const [px, py] of checks) {
    const tx = Math.floor(px / TILE_PIX);
    const ty = Math.floor(py / TILE_PIX);
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return true;
    if (d.tiles[ty * MAP_W + tx] === TILE_TYPE.WALL) return true;
  }
  return false;
}

// 分轴滑动移动：先动 X，撞了就回退；再动 Y，撞了就回退
// 返回：是否真的移动了
export function moveEntity(
  d: DungeonState,
  pos: { x: number; y: number },
  dx: number, dy: number,
  radius: number,
): { movedX: boolean; movedY: boolean } {
  let movedX = false, movedY = false;
  // X 轴
  const nx = pos.x + dx;
  if (!circleHitsWall(d, nx, pos.y, radius)) {
    pos.x = nx;
    movedX = dx !== 0;
  }
  // Y 轴
  const ny = pos.y + dy;
  if (!circleHitsWall(d, pos.x, ny, radius)) {
    pos.y = ny;
    movedY = dy !== 0;
  }
  return { movedX, movedY };
}

// 检查某点是否可走（给外部检查楼梯/商店位置用）
export function isFloor(d: DungeonState, px: number, py: number): boolean {
  const tx = Math.floor(px / TILE_PIX);
  const ty = Math.floor(py / TILE_PIX);
  if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false;
  const t = d.tiles[ty * MAP_W + tx];
  return t === TILE_TYPE.FLOOR || t === TILE_TYPE.STAIRS;
}

// 世界坐标 → 瓦片坐标
export function worldToTile(x: number, y: number): { tx: number; ty: number } {
  return { tx: Math.floor(x / TILE_PIX), ty: Math.floor(y / TILE_PIX) };
}

// 瓦片坐标 → 世界中心坐标
export function tileToWorld(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_PIX + TILE_PIX / 2, y: ty * TILE_PIX + TILE_PIX / 2 };
}

// 圆形之间距离（用于玩家和敌人互相之间的碰撞/攻击范围）
export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2, dy = y1 - y2;
  return dx * dx + dy * dy;
}
