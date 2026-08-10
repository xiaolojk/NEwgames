// MenuScene · 菜单场景
import Phaser from 'phaser';
import { COLORS, VIEW_W, VIEW_H, TILE, SCALE } from '../config';
import { GameState } from '../systems/GameState';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;

    // 暗色背景
    this.cameras.main.setBackgroundColor(COLORS.uiBg);
    // 背景粒子（漂浮的橙色光点）
    this.time.addEvent({
      delay: 200,
      callback: () => {
        const p = this.add.circle(
          Math.random() * VIEW_W, VIEW_H + 10,
          1 + Math.random() * 2,
          0xffaa30, 0.5 + Math.random() * 0.3,
        );
        this.tweens.add({
          targets: p,
          y: -20,
          alpha: 0,
          duration: 4000 + Math.random() * 2000,
          onComplete: () => p.destroy(),
        });
      },
      loop: true,
    });

    // 标题
    const title = this.add.text(cx, cy - 140, '橘 子 地 牢', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '64px',
      color: '#ffaa30',
      stroke: '#3a1810',
      strokeThickness: 8,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: cy - 135,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // 副标题
    this.add.text(cx, cy - 80, 'ORANGE DUNGEON', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#a09078',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 50, 'Orgc 橘子工作室 · Roguelike 地牢探险', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#807060',
    }).setOrigin(0.5);

    // 玩家预览（4 方向站立）
    const preview = this.add.sprite(cx, cy + 20, 'player', 0)
      .setScale(SCALE * 2)
      .setOrigin(0.5);
    // 让预览角色朝向各方向循环
    let dir = 0;
    this.time.addEvent({
      delay: 800,
      callback: () => {
        dir = (dir + 1) % 4;
        preview.setFrame(dir * 4);  // 每方向第一帧
      },
      loop: true,
    });

    // 开始按钮
    const startBtn = this.add.text(cx, cy + 100, '▶ 开始冒险', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#ffe080',
      backgroundColor: '#4a2810',
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setColor('#fff0c0'));
    startBtn.on('pointerout', () => startBtn.setColor('#ffe080'));
    startBtn.on('pointerdown', () => {
      this.scene.start('Game');
    });

    // 最佳记录
    const tmpState = new GameState();
    const best = tmpState.loadBest();
    if (best && best.floor) {
      this.add.text(cx, cy + 160,
        `最佳记录：第 ${best.floor} 层 · 击杀 ${best.kills} · 金币 ${best.gold}`,
        {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#a09078',
        }).setOrigin(0.5);
    }

    // 操作说明
    this.add.text(cx, cy + 200,
      'WASD/方向键 移动 · 空格/鼠标 攻击 · Shift 冲刺 · 1-5 道具',
      {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#605040',
      }).setOrigin(0.5);

    // 版本号
    this.add.text(VIEW_W - 8, VIEW_H - 8, 'v1.0 · OrgcOrange', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#403028',
    }).setOrigin(1, 1);
  }
}
