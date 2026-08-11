// 资源预加载 · 赤焰地牢
// 用 Canvas 程序化生成贴图，零外部资源依赖
import Phaser from 'phaser';
import { COLORS, TILE_PIX, SCALE, VIEW_W, VIEW_H } from '../config';

// 颜色解包：避免依赖 Phaser.Color API
function RGB(c: number): [number, number, number] {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}
function CSS(c: number): string {
  const [r, g, b] = RGB(c);
  return `rgb(${r},${g},${b})`;
}

function floorTex(g: Phaser.Game, key: string, base: number, seed: number) {
  const size = TILE_PIX;
  const tex = g.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const [cr, cg, cb] = RGB(base);
  ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
  ctx.fillRect(0, 0, size, size);
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 22; i++) {
    const v = Math.floor(rnd() * 20) - 10;
    const nr = Math.max(0, Math.min(255, cr + v));
    const ng = Math.max(0, Math.min(255, cg + v));
    const nb = Math.max(0, Math.min(255, cb + v));
    const x = Math.floor(rnd() * size);
    const y = Math.floor(rnd() * size);
    ctx.fillStyle = `rgb(${nr},${ng},${nb})`;
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.fillStyle = `rgba(0,0,0,0.08)`;
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rnd() * size);
    const y = Math.floor(rnd() * size);
    ctx.fillRect(x, y, 1, size);
  }
  ctx.fillStyle = `rgba(0,0,0,0.12)`;
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 0, 2, size);
  tex.refresh();
}

function stairsTex(g: Phaser.Game) {
  const size = TILE_PIX;
  const tex = g.textures.createCanvas('tile_stairs', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const [cr, cg, cb] = RGB(COLORS.floorC);
  ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = CSS(COLORS.stairs);
  ctx.fillRect(4, 4, size - 8, size - 8);
  ctx.fillStyle = CSS(COLORS.stairsTop);
  const steps = 4;
  const stepH = (size - 8) / steps;
  for (let i = 0; i < steps; i++) {
    ctx.fillRect(4 + i * 2, 4 + i * stepH, size - 8 - i * 4, 2);
  }
  tex.refresh();
}

function playerTex(g: Phaser.Game) {
  const size = 64;
  const tex = g.textures.createCanvas('spr_player', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = 32, cy = 36;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, 52, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const [pcr, pcg, pcb] = RGB(COLORS.player);
  const [pdcr, pdcg, pdcb] = RGB(COLORS.playerDark);
  ctx.fillStyle = `rgb(${pcr},${pcg},${pcb})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgb(${pdcr},${pdcg},${pdcb})`;
  ctx.beginPath();
  ctx.arc(cx, cy + 4, 13, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#a04040';
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 13, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 13, cy - 8, 26, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - 7, cy - 3, 4, 4);
  ctx.fillRect(cx + 3, cy - 3, 4, 4);
  ctx.fillStyle = '#201020';
  ctx.fillRect(cx - 6, cy - 2, 2, 2);
  ctx.fillRect(cx + 4, cy - 2, 2, 2);
  ctx.fillStyle = '#c02030';
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy + 2);
  ctx.quadraticCurveTo(cx - 18, cy + 16, cx - 8, cy + 18);
  ctx.lineTo(cx + 8, cy + 18);
  ctx.quadraticCurveTo(cx + 18, cy + 16, cx + 12, cy + 2);
  ctx.lineTo(cx + 6, cy + 8);
  ctx.lineTo(cx - 6, cy + 8);
  ctx.closePath();
  ctx.fill();
  tex.refresh();
}

function enemyTex(g: Phaser.Game, key: string, cfg: { color: number; eyeColor: number; radius: number }) {
  const size = 64;
  const tex = g.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = 32, cy = 36;
  const [cr, cg, cb] = RGB(cfg.color);
  const [er, eg, eb] = RGB(cfg.eyeColor);
  const r = Math.min(22, cfg.radius * 3);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, 52, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
  if (key === 'enemy_bat') {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.quadraticCurveTo(cx - r - 10, cy - 14, cx - r - 4, cy - 20);
    ctx.lineTo(cx - r + 2, cy - 4);
    ctx.lineTo(cx, cy - r * 0.6);
    ctx.lineTo(cx + r - 2, cy - 4);
    ctx.lineTo(cx + r + 4, cy - 20);
    ctx.quadraticCurveTo(cx + r + 10, cy - 14, cx + r, cy);
    ctx.ellipse(cx, cy, r * 0.8, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'enemy_skeleton') {
    ctx.beginPath();
    ctx.arc(cx, cy - 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - r * 0.6, cy + r * 0.4, r * 1.2, r * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cx - r * 0.4 + i * r * 0.25, cy + r * 0.5, 2, r * 0.2);
    }
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,0.15)`;
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgb(${er},${eg},${eb})`;
  const eyeSize = Math.max(3, r * 0.18);
  ctx.fillRect(cx - r * 0.4 - eyeSize / 2, cy - r * 0.1, eyeSize, eyeSize);
  ctx.fillRect(cx + r * 0.4 - eyeSize / 2, cy - r * 0.1, eyeSize, eyeSize);
  ctx.fillStyle = '#000';
  ctx.fillRect(cx - r * 0.4, cy - r * 0.1 + 1, 1.5, 1.5);
  ctx.fillRect(cx + r * 0.4, cy - r * 0.1 + 1, 1.5, 1.5);
  if (key === 'enemy_boss') {
    ctx.fillStyle = '#300010';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.7);
    ctx.lineTo(cx - r * 0.9, cy - r - 10);
    ctx.lineTo(cx - r * 0.4, cy - r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.7, cy - r * 0.7);
    ctx.lineTo(cx + r * 0.9, cy - r - 10);
    ctx.lineTo(cx + r * 0.4, cy - r * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  tex.refresh();
}

function swordTex(g: Phaser.Game) {
  const size = 64;
  const tex = g.textures.createCanvas('spr_sword', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = 32, cy = 32;
  ctx.fillStyle = '#e0e8ff';
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy - 3);
  ctx.lineTo(cx + 28, cy - 1);
  ctx.lineTo(cx + 30, cy);
  ctx.lineTo(cx + 28, cy + 1);
  ctx.lineTo(cx + 4, cy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#80a0c0';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(cx + 6, cy - 2, 20, 1);
  ctx.fillStyle = '#ffd060';
  ctx.fillRect(cx + 2, cy - 6, 3, 12);
  ctx.fillStyle = '#804020';
  ctx.fillRect(cx - 10, cy - 2, 14, 4);
  ctx.fillStyle = '#ffd060';
  ctx.fillRect(cx - 12, cy - 3, 4, 6);
  tex.refresh();
}

function slashTex(g: Phaser.Game) {
  const size = 128;
  const tex = g.textures.createCanvas('fx_slash', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = 64, cy = 64;
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 50);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.5, 'rgba(255,240,200,0.8)');
  grad.addColorStop(1, 'rgba(255,120,40,0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  const r1 = 28, r2 = 55;
  for (let a = -0.9; a <= 0.9; a += 0.05) {
    const x1 = cx + Math.cos(a) * r1;
    const y1 = cy + Math.sin(a) * r1;
    const x2 = cx + Math.cos(a) * r2;
    const y2 = cy + Math.sin(a) * r2;
    if (a === -0.9) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let a = -0.85; a <= 0.85; a += 0.05) {
    const x = cx + Math.cos(a) * (r1 + r2) / 2;
    const y = cy + Math.sin(a) * (r1 + r2) / 2;
    if (a === -0.85) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  tex.refresh();
}

function fogTex(g: Phaser.Game) {
  const size = Math.max(VIEW_W, VIEW_H) * 1.6;
  const tex = g.textures.createCanvas('fx_fog', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  const r = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.6)');
  grad.addColorStop(1, 'rgba(0,0,0,0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function particleTex(g: Phaser.Game) {
  const mk = (k: string, [r1, g1, b1]: number[], [r2, g2, b2]: number[], [r3, g3, b3]: number[]) => {
    const tex = g.textures.createCanvas(k, 16, 16);
    if (!tex) return;
    const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, `rgba(${r1},${g1},${b1},1)`);
    grad.addColorStop(0.4, `rgba(${r2},${g2},${b2},0.8)`);
    grad.addColorStop(1, `rgba(${r3},${g3},${b3},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    tex.refresh();
  };
  mk('pt_spark', [255, 255, 220], [255, 200, 80], [255, 80, 20]);
  mk('pt_blood', [255, 180, 180], [220, 40, 50], [80, 10, 20]);
  mk('pt_gold',  [255, 255, 180], [255, 220, 80], [255, 150, 30]);
}

function itemTex(g: Phaser.Game) {
  const mk = (key: string, color: number, shape: 'circle' | 'potion') => {
    const size = 32;
    const tex = g.textures.createCanvas('item_' + key, size, size);
    if (!tex) return;
    const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
    const [cr, cg, cb] = RGB(color);
    if (shape === 'circle') {
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.arc(16, 16, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,0.35)`;
      ctx.beginPath();
      ctx.arc(12, 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(16, 16, 11, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(12, 4, 8, 6);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.arc(16, 20, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,0.3)`;
      ctx.beginPath();
      ctx.arc(13, 17, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    tex.refresh();
  };
  mk('gold', 0xffc040, 'circle');
  mk('hp',   0xff4050, 'potion');
  mk('sp',   0x40a0ff, 'potion');
}

function shopTex(g: Phaser.Game) {
  const size = 64;
  const tex = g.textures.createCanvas('npc_shop', size, size);
  if (!tex) return;
  const ctx = (tex.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
  const cx = 32, cy = 40;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, 58, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#502070';
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 18);
  ctx.lineTo(cx - 14, cy - 2);
  ctx.lineTo(cx + 14, cy - 2);
  ctx.lineTo(cx + 18, cy + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0d0a0';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#301040';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 14);
  ctx.lineTo(cx, cy - 38);
  ctx.lineTo(cx + 14, cy - 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#602080';
  ctx.fillRect(cx - 15, cy - 16, 30, 4);
  ctx.fillStyle = '#e0d0c0';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 2);
  ctx.quadraticCurveTo(cx, cy + 10, cx + 8, cy - 2);
  ctx.lineTo(cx + 6, cy + 2);
  ctx.quadraticCurveTo(cx, cy + 8, cx - 6, cy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#201020';
  ctx.fillRect(cx - 5, cy - 9, 2, 2);
  ctx.fillRect(cx + 3, cy - 9, 2, 2);
  tex.refresh();
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    floorTex(this.game, 'tile_fl_0', COLORS.floorA, 111);
    floorTex(this.game, 'tile_fl_1', COLORS.floorB, 222);
    floorTex(this.game, 'tile_fl_2', COLORS.floorC, 333);
    floorTex(this.game, 'tile_fl_3', COLORS.floorD, 444);
    stairsTex(this.game);
    playerTex(this.game);
    swordTex(this.game);
    slashTex(this.game);
    fogTex(this.game);
    particleTex(this.game);
    const enemyTypes: Record<string, { color: number; eyeColor: number; radius: number }> = {
      slime:    { color: 0xff4050, eyeColor: 0xffd0a0, radius: 4 * SCALE },
      bat:      { color: 0x6040a0, eyeColor: 0xff6060, radius: 3.5 * SCALE },
      skeleton: { color: 0xd0c8b0, eyeColor: 0xff4040, radius: 4.5 * SCALE },
      demon:    { color: 0x802040, eyeColor: 0xffa020, radius: 5 * SCALE },
      boss:     { color: 0xa00020, eyeColor: 0xffe040, radius: 7 * SCALE },
    };
    for (const [k, v] of Object.entries(enemyTypes)) {
      enemyTex(this.game, 'enemy_' + k, v);
    }
    itemTex(this.game);
    shopTex(this.game);
    console.log('[Crimson] 程序化贴图生成完毕');
    this.scene.start('Menu');
  }
}
