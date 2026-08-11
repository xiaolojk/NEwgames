// BootScene · 程序化生成所有贴图（零外部资源）
import Phaser from 'phaser';
import { COLORS } from '../config';

function RGB(c: number): [number, number, number] {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}
function CSS(c: number): string {
  const [r, g, b] = RGB(c);
  return `rgb(${r},${g},${b})`;
}

function waterTile(g: Phaser.Game, key: string, baseA: number, baseB: number, seed: number) {
  const size = 64;
  const tex = g.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const grd = ctx.createLinearGradient(0, 0, size, size);
  grd.addColorStop(0, CSS(baseA));
  grd.addColorStop(1, CSS(baseB));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  // 水彩小波
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const y = 10 + rand() * (size - 20);
    ctx.moveTo(4, y);
    for (let x = 4; x <= size - 4; x += 8) {
      const ny = y + Math.sin((x + seed) * 0.22 + i) * (1.5 + rand() * 2);
      ctx.lineTo(x, ny);
    }
    ctx.stroke();
  }
  tex.refresh();
}

function sandTile(g: Phaser.Game, key: string, grass: boolean) {
  const size = 64;
  const tex = g.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  if (!grass) {
    const grd = ctx.createLinearGradient(0, 0, 0, size);
    grd.addColorStop(0, CSS(COLORS.sand));
    grd.addColorStop(1, CSS(COLORS.sandDark));
    ctx.fillStyle = grd;
  } else {
    const grd = ctx.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, CSS(COLORS.grassA));
    grd.addColorStop(0.6, CSS(COLORS.grassB));
    grd.addColorStop(1, CSS(COLORS.grassC));
    ctx.fillStyle = grd;
  }
  ctx.fillRect(0, 0, size, size);
  // 颗粒噪点
  let s = grass ? 7 : 11;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 140; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = grass
      ? `rgba(${40 + (rand() * 40) | 0},${120 + (rand() * 50) | 0},${60 + (rand() * 30) | 0},0.35)`
      : `rgba(${180 + (rand() * 40) | 0},${150 + (rand() * 30) | 0},${90 + (rand() * 30) | 0},0.35)`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  // 草叶
  if (grass) {
    ctx.strokeStyle = 'rgba(60,130,80,0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const x = 4 + rand() * (size - 8);
      const y = 8 + rand() * (size - 16);
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.quadraticCurveTo(x + 2, y, x + 1, y - 3);
      ctx.stroke();
    }
  }
  tex.refresh();
}

function treeTex(g: Phaser.Game) {
  const size = 96;
  const tex = g.textures.createCanvas('spr_tree', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = size / 2;
  const by = size - 14;
  // 阴影
  ctx.fillStyle = 'rgba(20,40,30,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, by + 4, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 树干
  const trunkW = 10;
  ctx.fillStyle = CSS(COLORS.trunkDark);
  ctx.fillRect(cx - trunkW / 2 - 1, by - 26, trunkW + 2, 26);
  ctx.fillStyle = CSS(COLORS.trunk);
  ctx.fillRect(cx - trunkW / 2, by - 26, trunkW, 26);
  // 树冠：3 层叠加水彩
  const crowns: Array<[number, number, number, number]> = [
    [cx - 10, by - 40, 32, COLORS.leafB],
    [cx + 6, by - 38, 28, COLORS.leafA],
    [cx - 2, by - 52, 36, COLORS.leafLite],
  ];
  for (const [x, y, r, c] of crowns) {
    // 软边圈
    for (let t = 20; t >= 0; t--) {
      const tt = t / 20;
      ctx.globalAlpha = (1 - tt) * 0.4;
      ctx.fillStyle = CSS(c);
      ctx.beginPath();
      ctx.arc(x, y, r * (0.85 + tt * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(cx - 8, by - 56, 6, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
}

function rockTex(g: Phaser.Game) {
  const size = 80;
  const tex = g.textures.createCanvas('spr_rock', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = size / 2;
  const by = size - 12;
  // 阴影
  ctx.fillStyle = 'rgba(30,30,40,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, by + 4, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 石头：不规则多边形
  const rock: Array<[number, number]> = [
    [cx - 20, by - 2],
    [cx - 28, by - 16],
    [cx - 22, by - 32],
    [cx - 4, by - 38],
    [cx + 18, by - 34],
    [cx + 28, by - 22],
    [cx + 22, by - 6],
  ];
  ctx.fillStyle = CSS(COLORS.stoneDark);
  ctx.beginPath();
  ctx.moveTo(rock[0][0], rock[0][1] + 2);
  for (let i = 1; i < rock.length; i++) ctx.lineTo(rock[i][0], rock[i][1] + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CSS(COLORS.stone);
  ctx.beginPath();
  ctx.moveTo(rock[0][0], rock[0][1]);
  for (let i = 1; i < rock.length; i++) ctx.lineTo(rock[i][0], rock[i][1]);
  ctx.closePath();
  ctx.fill();
  // 高光
  ctx.fillStyle = CSS(COLORS.stoneLite);
  ctx.beginPath();
  ctx.moveTo(cx - 10, by - 32);
  ctx.quadraticCurveTo(cx - 2, by - 40, cx + 8, by - 30);
  ctx.quadraticCurveTo(cx - 2, by - 26, cx - 10, by - 32);
  ctx.fill();
  // 裂缝
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 18, by - 20);
  ctx.lineTo(cx - 6, by - 14);
  ctx.lineTo(cx + 6, by - 20);
  ctx.stroke();
  tex.refresh();
}

function playerTex(g: Phaser.Game) {
  const size = 64;
  const tex = g.textures.createCanvas('spr_player', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2 + 6;
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 裤子
  ctx.fillStyle = CSS(COLORS.playerPants);
  ctx.fillRect(cx - 10, cy, 20, 14);
  // 身体
  ctx.fillStyle = CSS(COLORS.playerShirt);
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy);
  ctx.lineTo(cx + 12, cy);
  ctx.lineTo(cx + 10, cy - 14);
  ctx.lineTo(cx - 10, cy - 14);
  ctx.closePath();
  ctx.fill();
  // 脖子/头
  ctx.fillStyle = CSS(COLORS.playerSkin);
  ctx.fillRect(cx - 3, cy - 17, 6, 4);
  ctx.beginPath();
  ctx.arc(cx, cy - 22, 10, 0, Math.PI * 2);
  ctx.fill();
  // 头发
  ctx.fillStyle = CSS(COLORS.playerHair);
  ctx.beginPath();
  ctx.arc(cx, cy - 25, 10, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 10, cy - 26, 20, 4);
  // 眼睛
  ctx.fillStyle = '#2b2733';
  ctx.fillRect(cx - 4, cy - 22, 2, 2);
  ctx.fillRect(cx + 2, cy - 22, 2, 2);
  // 小手
  ctx.fillStyle = CSS(COLORS.playerSkin);
  ctx.beginPath();
  ctx.arc(cx - 13, cy - 4, 3.2, 0, Math.PI * 2);
  ctx.arc(cx + 13, cy - 4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // 鞋子
  ctx.fillStyle = '#2b2733';
  ctx.fillRect(cx - 10, cy + 14, 8, 3);
  ctx.fillRect(cx + 2, cy + 14, 8, 3);
  tex.refresh();
}

function dropTex(g: Phaser.Game, key: string, color: number, kind: 'log' | 'stone') {
  const size = 32;
  const tex = g.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'log') {
    // 切短木头（圆柱截面）
    ctx.fillStyle = CSS(color);
    ctx.fillRect(cx - 12, cy - 5, 24, 10);
    ctx.fillStyle = CSS(0x5c371e);
    ctx.fillRect(cx - 12, cy + 5, 24, 1.5);
    // 截面环
    ctx.fillStyle = '#f0d8b6';
    ctx.beginPath(); ctx.arc(cx + 12, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = CSS(0x5c371e);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx + 12, cy, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 12, cy, 1.4, 0, Math.PI * 2); ctx.stroke();
    // 左边阴影
    ctx.fillStyle = 'rgba(92,55,30,0.35)';
    ctx.beginPath(); ctx.arc(cx - 12, cy, 5, 0, Math.PI * 2); ctx.fill();
  } else {
    // 小石块
    ctx.fillStyle = CSS(0x6b7079);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.lineTo(cx - 14, cy - 2);
    ctx.lineTo(cx - 4, cy - 10);
    ctx.lineTo(cx + 8, cy - 8);
    ctx.lineTo(cx + 12, cy + 2);
    ctx.lineTo(cx + 6, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = CSS(color);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.lineTo(cx - 12, cy - 2);
    ctx.lineTo(cx - 4, cy - 8);
    ctx.lineTo(cx + 7, cy - 6);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx + 4, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 6);
    ctx.lineTo(cx + 2, cy - 9);
    ctx.lineTo(cx + 2, cy - 4);
    ctx.closePath();
    ctx.fill();
  }
  tex.refresh();
}

function particleTex(game: Phaser.Game, key: string, color: number) {
  const size = 16;
  const tex = game.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  const [cr, cg, cb] = RGB(color);
  const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, cx);
  grd.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`);
  grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function clickMarker(g: Phaser.Game) {
  const size = 64;
  const tex = g.textures.createCanvas('spr_click', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(43,39,51,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.stroke();
  // 十字
  ctx.strokeStyle = 'rgba(230,122,90,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
  ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
  ctx.stroke();
  tex.refresh();
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    waterTile(this.game, 'tile_water0', COLORS.oceanDeep, COLORS.oceanMid, 77);
    waterTile(this.game, 'tile_water1', COLORS.oceanMid, COLORS.oceanLite, 88);
    sandTile(this.game, 'tile_sand', false);
    sandTile(this.game, 'tile_grass', true);

    treeTex(this.game);
    rockTex(this.game);
    playerTex(this.game);

    dropTex(this.game, 'drop_wood', COLORS.woodDrop, 'log');
    dropTex(this.game, 'drop_stone', COLORS.stoneDrop, 'stone');

    particleTex(this.game, 'pt_leaf', COLORS.leafLite);
    particleTex(this.game, 'pt_rock', COLORS.stoneLite);
    particleTex(this.game, 'pt_wood', COLORS.woodDrop);
    particleTex(this.game, 'pt_sand', COLORS.sandDark);

    clickMarker(this.game);

    console.log('[TinyIsle] 贴图生成完毕');
    this.scene.start('Game');
  }
}
