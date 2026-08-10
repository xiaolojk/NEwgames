// 像素画运行时生成器 · 橘子地牢
// 用 Phaser Graphics 程序化绘制所有精灵到纹理，避免外部资源依赖
// Orgc 橘子工作室

import Phaser from 'phaser';
import { COLORS, TILE } from '../config';

// 在 Graphics 上画一个像素方块（以 TILE 坐标系）
function pix(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillRect(x, y, 1, 1);
}

// 用字符串数组绘制像素图案
function drawPattern(
  g: Phaser.GameObjects.Graphics,
  pattern: string[],
  palette: Record<string, number>,
  ox = 0, oy = 0,
) {
  for (let y = 0; y < pattern.length; y++) {
    const row = pattern[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ' ' || ch === '.') continue;
      const c = palette[ch];
      if (c !== undefined) pix(g, ox + x, oy + y, c);
    }
  }
}

// ============ 玩家精灵（16x16，4方向 × 3帧行走动画） ============
const PLAYER_PAL: Record<string, number> = {
  '#': 0x1a0810,  // 描边
  'h': COLORS.playerHair,  // 头发
  'H': 0x6a3818, // 头发暗部
  's': COLORS.playerSkin,  // 皮肤
  'S': 0xc09060, // 皮肤暗
  'c': COLORS.player,      // 衣服（橘色）
  'C': 0xc05010, // 衣服暗
  'p': 0x4a2810, // 裤子
  'P': 0x2a1808, // 裤子暗
  'e': 0xfff0c0, // 眼睛
  'b': 0x804020, // 靴子
};

// 朝下站立帧
const PLAYER_DOWN_IDLE = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   ssssssss   ',
  '   se s ess   ',
  '   ssssssss   ',
  '    ssssss    ',
  '  cccccccccc  ',
  ' cccccccccccc ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '   pPpppPp    ',
  '   pPpppPp    ',
  '   bb  bb     ',
  '   bb  bb     ',
];

const PLAYER_DOWN_WALK1 = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   ssssssss   ',
  '   se s ess   ',
  '   ssssssss   ',
  '    ssssss    ',
  '  cccccccccc  ',
  ' cccccccccccc ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '  pPpppppP    ',
  '  pPpppp P    ',
  '  bb     b    ',
  '  bb     b    ',
];

const PLAYER_DOWN_WALK2 = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   ssssssss   ',
  '   se s ess   ',
  '   ssssssss   ',
  '    ssssss    ',
  '  cccccccccc  ',
  ' cccccccccccc ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '   PpppppPp   ',
  '   P pp ppP   ',
  '   b    bb    ',
  '   b    bb    ',
];

// 朝右站立
const PLAYER_RIGHT_IDLE = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhHhh   ',
  '   sssssshh   ',
  '   ss s ess   ',
  '   ssssssss   ',
  '    sssss#    ',
  '  cccccccc#   ',
  ' cccccccccc#  ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '   pPpppPp    ',
  '   pPpppPp    ',
  '   bb  bb     ',
  '   bb  bb     ',
];

const PLAYER_RIGHT_WALK1 = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhHhh   ',
  '   sssssshh   ',
  '   ss s ess   ',
  '   ssssssss   ',
  '    sssss#    ',
  '  cccccccc#   ',
  ' cccccccccc#  ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '  pPpppppP    ',
  '  pPpppp P    ',
  '  bb     b    ',
  '  bb     b    ',
];

const PLAYER_RIGHT_WALK2 = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhHhh   ',
  '   sssssshh   ',
  '   ss s ess   ',
  '   ssssssss   ',
  '    sssss#    ',
  '  cccccccc#   ',
  ' cccccccccc#  ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '   PpppppPp   ',
  '   P pp ppP   ',
  '   b    bb    ',
  '   b    bb    ',
];

// 朝上（背面）
const PLAYER_UP_IDLE = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '    hhhhhh    ',
  '  cccccccccc  ',
  ' cccccccccccc ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '   pPpppPp    ',
  '   pPpppPp    ',
  '   bb  bb     ',
  '   bb  bb     ',
];

const PLAYER_UP_WALK1 = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '    hhhhhh    ',
  '  cccccccccc  ',
  ' cccccccccccc ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '  pPpppppP    ',
  '  pPpppp P    ',
  '  bb     b    ',
  '  bb     b    ',
];

const PLAYER_UP_WALK2 = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '   hhhhhhhh   ',
  '    hhhhhh    ',
  '  cccccccccc  ',
  ' cccccccccccc ',
  ' cCccccccccC  ',
  '  cccccccccc  ',
  '   ppppppp    ',
  '   PpppppPp   ',
  '   P pp ppP   ',
  '   b    bb    ',
  '   b    bb    ',
];

const PLAYER_DOWN_FRAMES = [PLAYER_DOWN_IDLE, PLAYER_DOWN_WALK1, PLAYER_DOWN_IDLE, PLAYER_DOWN_WALK2];
const PLAYER_UP_FRAMES = [PLAYER_UP_IDLE, PLAYER_UP_WALK1, PLAYER_UP_IDLE, PLAYER_UP_WALK2];
const PLAYER_RIGHT_FRAMES = [PLAYER_RIGHT_IDLE, PLAYER_RIGHT_WALK1, PLAYER_RIGHT_IDLE, PLAYER_RIGHT_WALK2];
const PLAYER_LEFT_FRAMES = [PLAYER_RIGHT_IDLE, PLAYER_RIGHT_WALK1, PLAYER_RIGHT_IDLE, PLAYER_RIGHT_WALK2].map(mirrorPattern);

function mirrorPattern(p: string[]): string[] {
  return p.map(row => row.split('').reverse().join(''));
}

// ============ 敌人精灵 ============
const SLIME_PAL: Record<string, number> = {
  '#': 0x0a2010, 'g': COLORS.slime, 'G': 0x208038, 'e': 0xfff080, 'm': 0x80ffa0,
};
const SLIME1 = [
  '                ',
  '                ',
  '                ',
  '                ',
  '      gggg      ',
  '    gggggggg    ',
  '   ggegggggeg   ',
  '  gggggggggggg  ',
  ' gggggggggggggg ',
  ' ggggGGGGGGgggg ',
  ' ggGGGGGGGGGGgg ',
  '  gGGGmmGGGggg  ',
  '   gGGGGGGgg    ',
  '    ggggggg     ',
  '     gggg       ',
  '                ',
];
const SLIME2 = [
  '                ',
  '                ',
  '       gg       ',
  '     gggggg     ',
  '    gggggggg    ',
  '   ggegggggeg   ',
  '  gggggggggggg  ',
  ' gggggggggggggg ',
  ' gggggggggggggg ',
  ' gggGGGGGGGGggg ',
  ' ggGGGGGGGGGGgg ',
  '  gGGGmmGGGggg  ',
  '   gGGGGGGgg    ',
  '    gggggg      ',
  '     ggg        ',
  '                ',
];

const SKEL_PAL: Record<string, number> = {
  '#': 0x101010, 'b': COLORS.skeleton, 'B': 0xa0a090, 'e': 0x202020, 'r': 0x802020,
};
const SKEL1 = [
  '                ',
  '     bbbbb      ',
  '    bbbbbbbb    ',
  '   bbebbbebb    ',
  '   bbebbbebb    ',
  '    bbbbbb      ',
  '     bbbb       ',
  '   bbbbbbbb     ',
  '  bbbbbbbbbb    ',
  '  bbbrrrrbbb    ',
  '   bbbbbbbb     ',
  '    bbbbbb      ',
  '    bb  bb      ',
  '    bb  bb      ',
  '    BB  BB      ',
  '    BB  BB      ',
];
const SKEL2 = [
  '     bbbbb      ',
  '    bbbbbbbb    ',
  '   bbebbbebb    ',
  '   bbebbbebb    ',
  '    bbbbbb      ',
  '     bbbb       ',
  '   bbbbbbbb     ',
  '  bbbbbbbbbb    ',
  '  bbbrrrrbbb    ',
  '   bbbbbbbb     ',
  '    bbbbbb      ',
  '    bbbbbb      ',
  '   bb    bb     ',
  '   bb    bb     ',
  '   BB    BB     ',
  '   BB    BB     ',
];

const BAT_PAL: Record<string, number> = {
  '#': 0x0a0418, 'p': COLORS.bat, 'P': 0x5020a0, 'e': 0xff4040, 'w': 0x301050,
};
const BAT1 = [
  '                ',
  '                ',
  '       pp       ',
  '      pppp      ',
  '  ww  ppepp  ww ',
  ' wwww pppppp wwww',
  'wwwwwwppppppwwwwww',
  'wwwww ppppp wwwww ',
  ' wwww  pp   wwww  ',
  '  ww    p    ww   ',
  '        p         ',
  '       ppp        ',
  '        p         ',
  '                ',
  '                ',
  '                ',
];
const BAT2 = [
  '                ',
  '                ',
  '       pp       ',
  '      pppp      ',
  ' www  ppepp  www',
  'wwww ppppppp wwww',
  'wwwwwwppppppwwwwww',
  'wwww pppppp wwww ',
  ' www  pppp  www  ',
  '  w    pp    w   ',
  '        p         ',
  '       ppp        ',
  '        p         ',
  '                ',
  '                ',
  '                ',
];

const BOSS_PAL: Record<string, number> = {
  '#': 0x200808, 'r': COLORS.bossRed, 'R': 0x801015, 'e': 0xffe040, 'b': 0x301010, 'f': 0xff6020,
};
const BOSS1 = [
  '       rrrrr       ',
  '      rrrrrrr      ',
  '     rrrrrrrrr     ',
  '    rrreeerrre     ',
  '    rreeeeerrr     ',
  '    rreeeerrrr     ',
  '     rrrrrrr       ',
  '   rrrrrrrrrrr     ',
  '  rrrrrrrrrrrrr    ',
  ' rrrrrfrrrfrrrrr   ',
  ' rrrrfffffffrrrr   ',
  '  rrrfffffffrrr    ',
  '   rrfffffffrr     ',
  '    rrrrrfrrr      ',
  '    rr   rrr       ',
  '    bb   bbb       ',
  '    bb   bbb       ',
  '    BB   BBB       ',
];

// ============ 瓦片 ============
function drawWall(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  // 16x16 砖墙：深色底 + 砖块纹理
  g.fillStyle(COLORS.wallDark, 1);
  g.fillRect(x, y, TILE, TILE);
  // 砖块亮边
  g.fillStyle(COLORS.wallLight, 1);
  // 上边亮
  g.fillRect(x, y, TILE, 2);
  // 砖块分隔
  g.fillStyle(0x2a1822, 1);
  g.fillRect(x, y + 7, TILE, 1);
  g.fillRect(x, y + 15, TILE, 1);
  g.fillRect(x + 7, y, 1, 7);
  g.fillRect(x + 3, y + 8, 1, 7);
  g.fillRect(x + 11, y + 8, 1, 7);
}

function drawFloor(g: Phaser.GameObjects.Graphics, x: number, y: number, variant: number) {
  g.fillStyle(COLORS.floorDark, 1);
  g.fillRect(x, y, TILE, TILE);
  // 地砖纹理（用 variant 选择模式）
  const rng = mulberry32(variant * 1337);
  for (let i = 0; i < 4; i++) {
    const px = x + Math.floor(rng() * TILE);
    const py = y + Math.floor(rng() * TILE);
    g.fillStyle(COLORS.floorLight, 0.6);
    g.fillRect(px, py, 1, 1);
  }
  // 边缘暗化
  g.fillStyle(0x100810, 0.4);
  g.fillRect(x, y, TILE, 1);
  g.fillRect(x, y, 1, TILE);
}

function drawDoor(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(COLORS.floorDark, 1);
  g.fillRect(x, y, TILE, TILE);
  // 门框
  g.fillStyle(COLORS.door, 1);
  g.fillRect(x + 2, y + 1, TILE - 4, TILE - 2);
  g.fillStyle(0x5a3010, 1);
  g.fillRect(x + 3, y + 2, TILE - 6, TILE - 4);
  // 把手
  g.fillStyle(0xffd030, 1);
  g.fillRect(x + TILE - 6, y + TILE / 2, 2, 2);
}

function drawStairs(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(COLORS.floorDark, 1);
  g.fillRect(x, y, TILE, TILE);
  // 下行楼梯：从下到上的阶梯
  g.fillStyle(COLORS.stairs, 1);
  for (let i = 0; i < 5; i++) {
    g.fillRect(x + 2 + i * 2, y + TILE - 3 - i * 2, TILE - 4 - i * 4, 2);
  }
  g.fillStyle(0xff6010, 0.6);
  g.fillRect(x + 2, y + TILE - 3, TILE - 4, 1);
}

function drawChest(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(COLORS.floorDark, 1);
  g.fillRect(x, y, TILE, TILE);
  // 宝箱底座
  g.fillStyle(COLORS.chest, 1);
  g.fillRect(x + 2, y + 5, TILE - 4, TILE - 7);
  // 盖子
  g.fillStyle(0xa06020, 1);
  g.fillRect(x + 2, y + 3, TILE - 4, 4);
  // 锁
  g.fillStyle(0xffd030, 1);
  g.fillRect(x + TILE / 2 - 1, y + 6, 2, 3);
  // 边框
  g.fillStyle(0x5a3010, 1);
  g.fillRect(x + 2, y + 4, TILE - 4, 1);
  g.fillRect(x + 2, y + 9, TILE - 4, 1);
}

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

// ============ 道具图标 ============
function drawPotion(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  // 瓶身
  g.fillStyle(0x808090, 1);
  g.fillRect(x + 5, y + 1, 6, 3);
  g.fillStyle(color, 1);
  g.fillRect(x + 4, y + 4, 8, 9);
  g.fillStyle(0x5a5a6a, 1);
  g.fillRect(x + 4, y + 12, 8, 2);
  // 高光
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(x + 5, y + 5, 2, 4);
}

function drawGold(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(0x806020, 1);
  g.fillRect(x + 4, y + 12, 8, 2);
  g.fillStyle(COLORS.gold, 1);
  g.fillRect(x + 5, y + 4, 6, 8);
  g.fillStyle(0xffe060, 1);
  g.fillRect(x + 6, y + 5, 4, 6);
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(x + 6, y + 5, 2, 2);
}

function drawSword(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  // 剑刃
  g.fillStyle(0x808090, 1);
  g.fillRect(x + 10, y + 1, 2, 10);
  g.fillStyle(0xc0c0d0, 1);
  g.fillRect(x + 9, y + 2, 2, 8);
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(x + 9, y + 3, 1, 6);
  // 护手
  g.fillStyle(0x804020, 1);
  g.fillRect(x + 7, y + 10, 6, 2);
  // 剑柄
  g.fillStyle(0x4a2810, 1);
  g.fillRect(x + 10, y + 12, 2, 4);
}

// 攻击挥砍特效（径向弧）
function drawSlash(g: Phaser.GameObjects.Graphics) {
  g.clear();
  g.fillStyle(COLORS.slash, 0.7);
  // 用扇形近似
  for (let r = 14; r < 30; r += 2) {
    for (let a = -0.6; a < 0.6; a += 0.1) {
      const px = 16 + Math.cos(a) * r;
      const py = 16 + Math.sin(a) * r;
      g.fillRect(Math.floor(px), Math.floor(py), 2, 2);
    }
  }
  g.fillStyle(0xffffff, 0.9);
  for (let r = 18; r < 26; r += 2) {
    for (let a = -0.3; a < 0.3; a += 0.1) {
      const px = 16 + Math.cos(a) * r;
      const py = 16 + Math.sin(a) * r;
      g.fillRect(Math.floor(px), Math.floor(py), 2, 2);
    }
  }
}

// 血迹粒子
function drawBlood(g: Phaser.GameObjects.Graphics) {
  g.clear();
  g.fillStyle(COLORS.blood, 1);
  g.fillRect(7, 7, 2, 2);
  g.fillRect(5, 8, 1, 1);
  g.fillRect(9, 6, 1, 1);
  g.fillRect(8, 10, 1, 1);
  g.fillRect(6, 6, 1, 1);
}

// ============ 生成所有纹理 ============
export function generateAllTextures(scene: Phaser.Scene): void {
  // 玩家：4方向 × 4帧 = 16 帧
  // 使用 spritesheet：每帧 16x16
  const playerFrames: string[][][] = [
    PLAYER_DOWN_FRAMES, PLAYER_LEFT_FRAMES, PLAYER_RIGHT_FRAMES, PLAYER_UP_FRAMES,
  ];
  // 用 canvas texture 手动构建 spritesheet
  const frameSize = 16;
  const cols = 4; // 4 帧每方向
  const rows = 4; // 4 方向
  const cw = cols * frameSize;
  const ch = rows * frameSize;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  // 用 ImageData 直接写像素，性能更好
  const imgData = ctx.createImageData(cw, ch);
  const data = imgData.data;

  for (let dir = 0; dir < 4; dir++) {
    const frames = playerFrames[dir];
    for (let f = 0; f < 4; f++) {
      const pattern = frames[f];
      for (let y = 0; y < pattern.length; y++) {
        const row = pattern[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === ' ' || ch === '.') continue;
          const color = PLAYER_PAL[ch];
          if (color === undefined) continue;
          const r = (color >> 16) & 0xff;
          const gg = (color >> 8) & 0xff;
          const b = color & 0xff;
          const px = f * frameSize + x;
          const py = dir * frameSize + y;
          const idx = (py * cw + px) * 4;
          data[idx] = r;
          data[idx + 1] = gg;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const playerTex = scene.textures.addCanvas('player', canvas);
  if (playerTex) {
    // 添加 16 帧（4方向 × 4帧），frame 索引 = dir * 4 + f
    for (let dir = 0; dir < 4; dir++) {
      for (let f = 0; f < 4; f++) {
        const frameName = dir * 4 + f;
        playerTex.add(frameName, 0, f * frameSize, dir * frameSize, frameSize, frameSize);
      }
    }
  }

  // 敌人：每种 2 帧（待机 + 动作），各一张 spritesheet
  const enemyDefs: Array<{ key: string; pal: Record<string, number>; frames: string[][]; size: number }> = [
    { key: 'slime', pal: SLIME_PAL, frames: [SLIME1, SLIME2], size: 16 },
    { key: 'skeleton', pal: SKEL_PAL, frames: [SKEL1, SKEL2], size: 16 },
    { key: 'bat', pal: BAT_PAL, frames: [BAT1, BAT2], size: 16 },
    { key: 'boss', pal: BOSS_PAL, frames: [BOSS1, BOSS1], size: 18 },
  ];
  for (const def of enemyDefs) {
    const fs = def.size;
    const ec = document.createElement('canvas');
    ec.width = fs * 2;
    ec.height = fs;
    const ectx = ec.getContext('2d')!;
    const eid = ectx.createImageData(fs * 2, fs);
    const ed = eid.data;
    for (let f = 0; f < 2; f++) {
      const pattern = def.frames[f];
      for (let y = 0; y < pattern.length; y++) {
        const row = pattern[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === ' ' || ch === '.') continue;
          const color = def.pal[ch];
          if (color === undefined) continue;
          const r = (color >> 16) & 0xff;
          const gg = (color >> 8) & 0xff;
          const b = color & 0xff;
          const px = f * fs + x;
          const py = y;
          if (px >= fs * 2 || py >= fs) continue;
          const idx = (py * fs * 2 + px) * 4;
          ed[idx] = r;
          ed[idx + 1] = gg;
          ed[idx + 2] = b;
          ed[idx + 3] = 255;
        }
      }
    }
    ectx.putImageData(eid, 0, 0);
    const eTex = scene.textures.addCanvas(def.key, ec);
    if (eTex) {
      // 添加 2 帧
      eTex.add(0, 0, 0, 0, fs, fs);
      eTex.add(1, 0, fs, 0, fs, fs);
    }
  }

  // 瓦片：每种生成 4 个变体（floor）
  // wall
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = TILE; wallCanvas.height = TILE;
  const wctx = wallCanvas.getContext('2d')!;
  const wImg = wctx.createImageData(TILE, TILE);
  paintWall(wImg.data);
  wctx.putImageData(wImg, 0, 0);
  scene.textures.addCanvas('tile_wall', wallCanvas);

  // floor × 4 变体
  for (let v = 0; v < 4; v++) {
    const fc = document.createElement('canvas');
    fc.width = TILE; fc.height = TILE;
    const fctx = fc.getContext('2d')!;
    const fImg = fctx.createImageData(TILE, TILE);
    paintFloor(fImg.data, v);
    fctx.putImageData(fImg, 0, 0);
    scene.textures.addCanvas(`tile_floor_${v}`, fc);
  }

  // door / stairs / chest
  const doorC = document.createElement('canvas');
  doorC.width = TILE; doorC.height = TILE;
  paintToCanvas(doorC, paintDoor);
  scene.textures.addCanvas('tile_door', doorC);

  const stairsC = document.createElement('canvas');
  stairsC.width = TILE; stairsC.height = TILE;
  paintToCanvas(stairsC, paintStairs);
  scene.textures.addCanvas('tile_stairs', stairsC);

  const chestC = document.createElement('canvas');
  chestC.width = TILE; chestC.height = TILE;
  paintToCanvas(chestC, paintChest);
  scene.textures.addCanvas('tile_chest', chestC);

  // 道具：potion_hp, potion_sp, potion_str, potion_def, gold, wood, iron, key, sword
  makeItemTexture(scene, 'item_potion_hp', 0xe03040);
  makeItemTexture(scene, 'item_potion_sp', 0x3070e0);
  makeItemTexture(scene, 'item_potion_str', 0xe0a020);
  makeItemTexture(scene, 'item_potion_def', 0x30a050);
  makeItemTexture(scene, 'item_gold', -1);  // 特殊：金币
  makeItemTexture(scene, 'item_wood', -2);
  makeItemTexture(scene, 'item_iron', -3);
  makeItemTexture(scene, 'item_key', -4);
  makeItemTexture(scene, 'item_sword', -5);

  // 特效
  const slashC = document.createElement('canvas');
  slashC.width = 32; slashC.height = 32;
  const slashCtx = slashC.getContext('2d')!;
  const slashImg = slashCtx.createImageData(32, 32);
  paintSlash(slashImg.data);
  slashCtx.putImageData(slashImg, 0, 0);
  scene.textures.addCanvas('fx_slash', slashC);

  const bloodC = document.createElement('canvas');
  bloodC.width = 16; bloodC.height = 16;
  const bloodCtx = bloodC.getContext('2d')!;
  const bloodImg = bloodCtx.createImageData(16, 16);
  paintBlood(bloodImg.data);
  bloodCtx.putImageData(bloodImg, 0, 0);
  scene.textures.addCanvas('fx_blood', bloodC);

  // 数字飘字
  const dmgC = document.createElement('canvas');
  dmgC.width = 32; dmgC.height = 16;
  scene.textures.addCanvas('fx_dmg', dmgC);

  // 黑暗遮罩（圆形视野）
  const fogC = document.createElement('canvas');
  fogC.width = 256; fogC.height = 256;
  const fogCtx = fogC.getContext('2d')!;
  const grd = fogCtx.createRadialGradient(128, 128, 40, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0.4)');
  grd.addColorStop(1, 'rgba(0,0,0,0.92)');
  fogCtx.fillStyle = grd;
  fogCtx.fillRect(0, 0, 256, 256);
  scene.textures.addCanvas('fog', fogC);

  console.log('[Orgc] 像素资产已生成');
}

function paintToCanvas(canvas: HTMLCanvasElement, painter: (data: Uint8ClampedArray) => void) {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(TILE, TILE);
  painter(img.data);
  ctx.putImageData(img, 0, 0);
}

function setPx(data: Uint8ClampedArray, w: number, x: number, y: number, color: number, alpha = 255) {
  if (x < 0 || y < 0 || x >= w) return;
  const idx = (y * w + x) * 4;
  data[idx] = (color >> 16) & 0xff;
  data[idx + 1] = (color >> 8) & 0xff;
  data[idx + 2] = color & 0xff;
  data[idx + 3] = alpha;
}

function paintWall(d: Uint8ClampedArray) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      setPx(d, TILE, x, y, COLORS.wallDark);
    }
  }
  // 上边亮
  for (let x = 0; x < TILE; x++) {
    setPx(d, TILE, x, 0, COLORS.wallLight);
    setPx(d, TILE, x, 1, COLORS.wallLight);
  }
  // 砖缝
  for (let x = 0; x < TILE; x++) {
    setPx(d, TILE, x, 7, 0x100810);
    setPx(d, TILE, x, 15, 0x100810);
  }
  setPx(d, TILE, 7, 2, 0x100810); setPx(d, TILE, 7, 3, 0x100810);
  setPx(d, TILE, 7, 4, 0x100810); setPx(d, TILE, 7, 5, 0x100810);
  setPx(d, TILE, 7, 6, 0x100810);
  setPx(d, TILE, 3, 8, 0x100810); setPx(d, TILE, 3, 9, 0x100810);
  setPx(d, TILE, 3, 10, 0x100810); setPx(d, TILE, 3, 11, 0x100810);
  setPx(d, TILE, 3, 12, 0x100810); setPx(d, TILE, 3, 13, 0x100810);
  setPx(d, TILE, 3, 14, 0x100810);
  setPx(d, TILE, 11, 8, 0x100810); setPx(d, TILE, 11, 9, 0x100810);
  setPx(d, TILE, 11, 10, 0x100810); setPx(d, TILE, 11, 11, 0x100810);
  setPx(d, TILE, 11, 12, 0x100810); setPx(d, TILE, 11, 13, 0x100810);
  setPx(d, TILE, 11, 14, 0x100810);
}

function paintFloor(d: Uint8ClampedArray, variant: number) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      setPx(d, TILE, x, y, COLORS.floorDark);
    }
  }
  const rng = mulberry32(variant * 1337 + 42);
  for (let i = 0; i < 6; i++) {
    const px = Math.floor(rng() * TILE);
    const py = Math.floor(rng() * TILE);
    setPx(d, TILE, px, py, COLORS.floorLight, 200);
  }
  // 边缘暗化
  for (let x = 0; x < TILE; x++) {
    setPx(d, TILE, x, 0, 0x100810, 120);
    setPx(d, TILE, x, TILE - 1, 0x100810, 80);
  }
  for (let y = 0; y < TILE; y++) {
    setPx(d, TILE, 0, y, 0x100810, 120);
    setPx(d, TILE, TILE - 1, y, 0x100810, 80);
  }
}

function paintDoor(d: Uint8ClampedArray) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) setPx(d, TILE, x, y, COLORS.floorDark);
  for (let y = 1; y < TILE - 1; y++) for (let x = 2; x < TILE - 2; x++) setPx(d, TILE, x, y, COLORS.door);
  for (let y = 2; y < TILE - 2; y++) for (let x = 3; x < TILE - 3; x++) setPx(d, TILE, x, y, 0x5a3010);
  setPx(d, TILE, TILE - 6, Math.floor(TILE / 2), 0xffd030);
  setPx(d, TILE, TILE - 6, Math.floor(TILE / 2) + 1, 0xffd030);
}

function paintStairs(d: Uint8ClampedArray) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) setPx(d, TILE, x, y, COLORS.floorDark);
  for (let i = 0; i < 5; i++) {
    const yy = TILE - 3 - i * 2;
    const xx = 2 + i * 2;
    const ww = TILE - 4 - i * 4;
    for (let x = 0; x < ww; x++) setPx(d, TILE, xx + x, yy, COLORS.stairs);
    setPx(d, TILE, xx, yy, 0xff6010);
  }
}

function paintChest(d: Uint8ClampedArray) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) setPx(d, TILE, x, y, COLORS.floorDark);
  // 底座
  for (let y = 5; y < TILE - 2; y++) for (let x = 2; x < TILE - 2; x++) setPx(d, TILE, x, y, COLORS.chest);
  // 盖子
  for (let y = 3; y < 7; y++) for (let x = 2; x < TILE - 2; x++) setPx(d, TILE, x, y, 0xa06020);
  // 边框
  for (let x = 2; x < TILE - 2; x++) {
    setPx(d, TILE, x, 4, 0x5a3010);
    setPx(d, TILE, x, 9, 0x5a3010);
  }
  // 锁
  setPx(d, TILE, Math.floor(TILE / 2) - 1, 6, 0xffd030);
  setPx(d, TILE, Math.floor(TILE / 2), 6, 0xffd030);
  setPx(d, TILE, Math.floor(TILE / 2) - 1, 7, 0xffd030);
  setPx(d, TILE, Math.floor(TILE / 2), 7, 0xffd030);
  setPx(d, TILE, Math.floor(TILE / 2) - 1, 8, 0xffd030);
  setPx(d, TILE, Math.floor(TILE / 2), 8, 0xffd030);
}

function paintSlash(d: Uint8ClampedArray) {
  const cx = 16, cy = 16;
  for (let r = 12; r < 30; r += 1) {
    for (let a = -0.7; a < 0.7; a += 0.05) {
      const px = Math.floor(cx + Math.cos(a) * r);
      const py = Math.floor(cy + Math.sin(a) * r);
      if (px < 0 || py < 0 || px >= 32 || py >= 32) continue;
      const alpha = a === 0 ? 220 : Math.max(0, 180 - Math.abs(a) * 200);
      setPx(d, 32, px, py, COLORS.slash, alpha);
    }
  }
  for (let r = 16; r < 26; r += 1) {
    for (let a = -0.3; a < 0.3; a += 0.05) {
      const px = Math.floor(cx + Math.cos(a) * r);
      const py = Math.floor(cy + Math.sin(a) * r);
      if (px < 0 || py < 0 || px >= 32 || py >= 32) continue;
      setPx(d, 32, px, py, 0xffffff, 240);
    }
  }
}

function paintBlood(d: Uint8ClampedArray) {
  setPx(d, 16, 7, 7, COLORS.blood);
  setPx(d, 16, 8, 7, COLORS.blood);
  setPx(d, 16, 7, 8, COLORS.blood);
  setPx(d, 16, 8, 8, COLORS.blood);
  setPx(d, 16, 5, 8, COLORS.blood);
  setPx(d, 16, 9, 6, COLORS.blood);
  setPx(d, 16, 8, 10, COLORS.blood);
  setPx(d, 16, 6, 6, COLORS.blood);
  setPx(d, 16, 10, 9, COLORS.blood);
}

function makeItemTexture(scene: Phaser.Scene, key: string, kind: number) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(16, 16);
  const d = img.data;
  if (kind >= 0) {
    // 药水
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) setPx(d, 16, x, y, 0, 0);
    // 瓶口
    for (let x = 5; x < 11; x++) { setPx(d, 16, x, 1, 0x808090); setPx(d, 16, x, 2, 0x808090); setPx(d, 16, x, 3, 0x808090); }
    // 瓶身
    for (let y = 4; y < 13; y++) for (let x = 4; x < 12; x++) setPx(d, 16, x, y, kind);
    // 瓶底
    for (let x = 4; x < 12; x++) setPx(d, 16, x, 13, 0x5a3a30);
    for (let x = 5; x < 11; x++) setPx(d, 16, x, 14, 0x4a2a20);
    // 高光
    setPx(d, 16, 5, 5, 0xffffff, 130);
    setPx(d, 16, 5, 6, 0xffffff, 100);
    setPx(d, 16, 6, 5, 0xffffff, 100);
  } else if (kind === -1) {
    // 金币
    for (let x = 4; x < 12; x++) { setPx(d, 16, x, 12, 0x806020); setPx(d, 16, x, 13, 0x604010); }
    for (let y = 4; y < 12; y++) for (let x = 5; x < 11; x++) setPx(d, 16, x, y, COLORS.gold);
    for (let y = 5; y < 11; y++) for (let x = 6; x < 10; x++) setPx(d, 16, x, y, 0xffe060);
    setPx(d, 16, 6, 5, 0xffffff, 200);
    setPx(d, 16, 7, 5, 0xffffff, 150);
  } else if (kind === -2) {
    // 木材
    for (let y = 4; y < 12; y++) for (let x = 3; x < 13; x++) setPx(d, 16, x, y, 0x6a4020);
    for (let y = 4; y < 12; y++) {
      setPx(d, 16, 3, y, 0x3a2010);
      setPx(d, 16, 12, y, 0x3a2010);
    }
    // 年轮
    for (let x = 4; x < 12; x++) setPx(d, 16, x, 7, 0x4a2810);
    setPx(d, 16, 7, 6, 0x4a2810);
    setPx(d, 16, 8, 8, 0x4a2810);
    setPx(d, 16, 7, 8, 0x4a2810);
    setPx(d, 16, 8, 6, 0x4a2810);
  } else if (kind === -3) {
    // 铁矿
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) setPx(d, 16, x, y, 0x6a6a6a);
    for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) setPx(d, 16, x, y, 0x9a9a9a);
    // 矿点
    setPx(d, 16, 6, 6, 0xd0a060);
    setPx(d, 16, 8, 7, 0xd0a060);
    setPx(d, 16, 7, 9, 0xd0a060);
    setPx(d, 16, 9, 8, 0xd0a060);
    setPx(d, 16, 5, 5, 0xffffff, 150);
  } else if (kind === -4) {
    // 钥匙
    for (let x = 9; x < 14; x++) setPx(d, 16, x, 5, 0xffd030);
    for (let x = 9; x < 14; x++) setPx(d, 16, x, 6, 0xffd030);
    setPx(d, 16, 10, 5, 0x100810); setPx(d, 16, 10, 6, 0x100810);
    setPx(d, 16, 12, 5, 0x100810); setPx(d, 16, 12, 6, 0x100810);
    // 钥匙杆
    for (let y = 6; y < 13; y++) setPx(d, 16, 11, y, 0xc0a020);
    // 齿
    setPx(d, 16, 9, 11, 0xc0a020);
    setPx(d, 16, 9, 12, 0xc0a020);
    setPx(d, 16, 10, 12, 0xc0a020);
  } else if (kind === -5) {
    // 剑
    // 剑刃
    for (let y = 1; y < 11; y++) {
      setPx(d, 16, 9, y, 0x808090);
      setPx(d, 16, 10, y, 0xc0c0d0);
      setPx(d, 16, 11, y, 0x808090);
    }
    // 高光
    for (let y = 2; y < 10; y++) setPx(d, 16, 10, y, 0xffffff, 200);
    // 护手
    for (let x = 7; x < 13; x++) setPx(d, 16, x, 10, 0x804020);
    setPx(d, 16, 7, 11, 0x804020);
    setPx(d, 16, 12, 11, 0x804020);
    // 剑柄
    for (let y = 12; y < 16; y++) {
      setPx(d, 16, 9, y, 0x4a2810);
      setPx(d, 16, 10, y, 0x4a2810);
      setPx(d, 16, 11, y, 0x4a2810);
    }
    // 柄头
    setPx(d, 16, 9, 15, 0xc0a040);
    setPx(d, 16, 10, 15, 0xc0a040);
    setPx(d, 16, 11, 15, 0xc0a040);
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(key, c);
}
