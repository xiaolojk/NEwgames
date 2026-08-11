import Phaser from 'phaser';
import {
  GameState,
  TILE_SIZE,
  FARM_COLS,
  FARM_ROWS,
  TileState,
  CROPS,
  ToolType,
  Weather,
  Tile,
} from '../types/game';
import {
  createInitialState,
  saveGame,
  loadGame,
  nextSeason,
  randomWeather,
  formatTime,
  SEASON_INFO,
  canPlantInSeason,
} from '../game/GameState';
import { FarmRenderer } from '../game/FarmRenderer';
import { Player } from '../game/Player';

type UIState = 'closed' | 'shop' | 'inventory' | 'bed' | 'save';

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private farmRenderer!: FarmRenderer;
  private player!: Player;

  private baseX: number = 0;
  private baseY: number = 0;

  // UI 元素
  private topBarBg!: Phaser.GameObjects.Rectangle;
  private seasonDayText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Graphics;
  private weatherIcon!: Phaser.GameObjects.Text;

  // 底部工具栏
  private toolbarBg!: Phaser.GameObjects.Rectangle;
  private toolSlots: Phaser.GameObjects.Container[] = [];
  private toolIndex: number = 0;
  private toolsList: ToolType[] = ['hoe', 'can', 'axe', 'seed', 'hand'];

  // 侧边按钮
  private buttons!: {
    shop: Phaser.GameObjects.Container;
    inventory: Phaser.GameObjects.Container;
    bed: Phaser.GameObjects.Container;
    save: Phaser.GameObjects.Container;
  };

  // 面板
  private panels!: {
    shop: Phaser.GameObjects.Container;
    inventory: Phaser.GameObjects.Container;
    bed: Phaser.GameObjects.Container;
    toast: Phaser.GameObjects.Text;
  };

  private timeAccumulator: number = 0;
  private timeSpeedMs: number = 5000; // 每5秒走1小时
  private panelOpen: UIState = 'closed';

  private inputLocked: boolean = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // 恢复存档或新建
    const saved = loadGame();
    this.state = saved ?? createInitialState();

    // 自动保存
    this.scale.on('resize', () => this.layout());
    this.layout();
    this.initBackground();

    this.farmRenderer = new FarmRenderer(this, this.baseX, this.baseY);
    this.farmRenderer.render(this.state.tiles, this.state.season);

    // 玩家出生在农场下方中间
    const startC = Math.floor(FARM_COLS / 2);
    const startR = FARM_ROWS - 1;
    this.player = new Player(this, startC, startR, this.baseX, this.baseY);
    this.player.drawTool(this.state.selectedTool);

    this.initTopBar();
    this.initToolbar();
    this.initSideButtons();
    this.initPanels();

    // 输入绑定
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));

    // 时间推进
    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => this.tickTime(),
    });

    // 每30秒自动存档
    this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => saveGame(this.state),
    });

    this.updateAll();
    this.showToast('🌾 欢迎来到星露小镇！点击农场格子开始劳作吧~', 3200);
  }

  // ---------------- 布局 ----------------
  private layout(): void {
    const { width, height } = this.scale;
    // 农田居中，上方留104顶部栏，下方留136工具栏，右侧留84功能按钮
    const topH = 104;
    const bottomH = 136;
    const sideW = 84;
    const availW = width - sideW - 24;
    const availH = height - topH - bottomH - 24;
    const tileSize = Math.min(
      Math.floor(availW / FARM_COLS),
      Math.floor(availH / FARM_ROWS),
      84
    );
    // 我们固定使用TILE_SIZE逻辑坐标，通过camera scale实现缩放
    const farmW = FARM_COLS * TILE_SIZE;
    const farmH = FARM_ROWS * TILE_SIZE;
    const scale = Math.min(availW / farmW, availH / farmH, 1.3);
    this.cameras.main.zoom = scale;

    const viewW = width / scale;
    const viewH = height / scale;
    this.baseX = (viewW - farmW - sideW / scale) / 2;
    this.baseY = (viewH - farmH) / 2 + (topH / scale / 2 - bottomH / scale / 2);

    if (this.farmRenderer) {
      // 重新布局时，重绘农场并更新玩家位置
      this.farmRenderer.destroy();
      this.farmRenderer = new FarmRenderer(this, this.baseX, this.baseY);
      this.farmRenderer.render(this.state.tiles, this.state.season);
    }
    if (this.player) {
      this.player.setPosition(this.player.gridC, this.player.gridR, this.baseX, this.baseY);
    }

    // UI 根据屏幕重新放置
    this.positionFixedUI();
  }

  private positionFixedUI(): void {
    const { width, height } = this.scale;
    const s = 1; // UI不缩放
    this.cameras.main.setScroll(0, 0);
    // 固定UI放在scroll 0的世界位置 = 屏幕坐标（由于camera不滚动）
    if (this.topBarBg) {
      this.topBarBg.setPosition(0, 0).setSize(width, 96).setOrigin(0);
      this.seasonDayText.setPosition(18, 18);
      this.timeText.setPosition(18, 52);
      this.moneyText.setPosition(width - 18, 18).setOrigin(1, 0);
      this.energyBar.setPosition(18, 82);
      this.weatherIcon.setPosition(width - 18, 54).setOrigin(1, 0.5);
    }
    if (this.toolbarBg) {
      this.toolbarBg.setPosition(0, height).setSize(width, 124).setOrigin(0, 1);
      const slotCount = this.toolsList.length;
      const slotSize = 64;
      const gap = 10;
      const totalW = slotCount * slotSize + (slotCount - 1) * gap;
      const startX = (width - totalW) / 2;
      const y = height - 104;
      for (let i = 0; i < slotCount; i++) {
        const slot = this.toolSlots[i];
        if (slot) slot.setPosition(startX + i * (slotSize + gap) + slotSize / 2, y + slotSize / 2);
      }
    }
    if (this.buttons) {
      const bx = width - 48;
      let by = height - 180;
      for (const k of ['bed', 'inventory', 'shop', 'save'] as const) {
        const btn = this.buttons[k];
        btn.setPosition(bx, by);
        by -= 70;
      }
    }
  }

  // ---------------- 背景 ----------------
  private initBackground(): void {
    const s = SEASON_INFO[this.state.season];
    this.cameras.main.setBackgroundColor(s.bg);
  }

  // ---------------- 顶部栏 ----------------
  private initTopBar(): void {
    this.topBarBg = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0.92);
    this.topBarBg.setScrollFactor(0).setDepth(200).setStrokeStyle(1, 0xdddddd);

    this.seasonDayText = this.add.text(0, 0, '', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#2c3e50',
    });
    this.seasonDayText.setScrollFactor(0).setDepth(201);

    this.timeText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#2c3e50',
    });
    this.timeText.setScrollFactor(0).setDepth(201);

    this.moneyText = this.add.text(0, 0, '', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#b8860b',
    });
    this.moneyText.setScrollFactor(0).setDepth(201);

    this.energyBar = this.add.graphics();
    this.energyBar.setScrollFactor(0).setDepth(201);

    this.weatherIcon = this.add.text(0, 0, '', {
      fontSize: '30px',
    });
    this.weatherIcon.setScrollFactor(0).setDepth(201);
  }

  private drawEnergyBar(): void {
    const w = Math.min(320, this.scale.width - 200);
    const h = 12;
    const s = this.state;
    const ratio = Phaser.Math.Clamp(s.energy / s.maxEnergy, 0, 1);
    this.energyBar.clear();
    // 背景
    this.energyBar.fillStyle(0xe0e0e0);
    this.energyBar.fillRoundedRect(0, 0, w, h, 6);
    this.energyBar.lineStyle(1, 0xaaaaaa);
    this.energyBar.strokeRoundedRect(0, 0, w, h, 6);
    // 填充：颜色从绿->黄->红
    let color: number;
    if (ratio > 0.5) color = 0x2ecc71;
    else if (ratio > 0.2) color = 0xf1c40f;
    else color = 0xe74c3c;
    this.energyBar.fillStyle(color);
    this.energyBar.fillRoundedRect(2, 2, Math.max(0, (w - 4) * ratio), h - 4, 5);
    // 文字
    this.energyBar.setData('label-ratio', ratio);
  }

  // ---------------- 工具栏 ----------------
  private initToolbar(): void {
    this.toolbarBg = this.add.rectangle(0, 0, 10, 10, 0xfff9e7, 0.95);
    this.toolbarBg.setScrollFactor(0).setDepth(200).setStrokeStyle(1, 0xe0cfa0);

    const toolInfo: Record<ToolType, { name: string; icon: string; hint: string }> = {
      hoe:  { name: '锄头', icon: '⛏️', hint: '翻地 (消耗3体力)' },
      can:  { name: '水壶', icon: '🚿', hint: '浇水 (消耗2体力)' },
      axe:  { name: '斧头', icon: '🪓', hint: '清理杂草 (-1体力)' },
      seed: { name: '种子', icon: '🌱', hint: `种植: ${CROPS[this.state.selectedSeed].name} (-${CROPS[this.state.selectedSeed].seedPrice}金)` },
      hand: { name: '收获', icon: '✋', hint: '收获作物 / 拾取' },
    };

    this.toolSlots.forEach((s) => s.destroy());
    this.toolSlots = [];

    for (let i = 0; i < this.toolsList.length; i++) {
      const tool = this.toolsList[i];
      const info = toolInfo[tool];
      const slot = this.add.container(0, 0);
      slot.setScrollFactor(0).setDepth(201).setSize(64, 64);

      const bg = this.add.rectangle(0, 0, 64, 64, 0xffffff);
      bg.setStrokeStyle(2, 0xcccccc);
      slot.add(bg);

      const icon = this.add.text(0, -4, info.icon, { fontSize: '30px' });
      icon.setOrigin(0.5);
      slot.add(icon);

      const label = this.add.text(0, 24, info.name, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#555',
      });
      label.setOrigin(0.5);
      slot.add(label);

      const data = { tool, bg, label, hint: info.hint };
      slot.setData('info', data);

      slot.setInteractive({ useHandCursor: true });
      slot.on('pointerdown', () => this.selectTool(i));

      this.toolSlots.push(slot);
    }
    this.updateToolbarSelection();
  }

  private updateToolbarSelection(): void {
    const seedToolIdx = this.toolsList.indexOf('seed');
    for (let i = 0; i < this.toolSlots.length; i++) {
      const slot = this.toolSlots[i];
      const data = slot.getData('info') as { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; tool: ToolType };
      if (i === this.toolIndex) {
        data.bg.setFillStyle(0xfff2b3);
        data.bg.setStrokeStyle(3, 0xe67e22);
        data.label.setColor('#d35400');
      } else {
        data.bg.setFillStyle(0xffffff);
        data.bg.setStrokeStyle(2, 0xcccccc);
        data.label.setColor('#555');
      }
      if (i === seedToolIdx) {
        // 更新种子标签文字
        data.label.setText(CROPS[this.state.selectedSeed].name);
      }
    }
    this.player.drawTool(this.state.selectedTool);
  }

  private selectTool(i: number): void {
    this.toolIndex = i;
    this.state.selectedTool = this.toolsList[i];
    this.updateToolbarSelection();
    this.showToast(this.toolSlots[i].getData('info').hint, 1400);
  }

  // ---------------- 侧边按钮 ----------------
  private initSideButtons(): void {
    this.buttons = {
      shop: this.makeSideButton('🛒', '商店', () => this.togglePanel('shop')),
      inventory: this.makeSideButton('🎒', '背包', () => this.togglePanel('inventory')),
      bed: this.makeSideButton('🛏️', '睡觉', () => this.togglePanel('bed')),
      save: this.makeSideButton('💾', '保存', () => this.onSaveClick()),
    };
    for (const k of Object.keys(this.buttons) as (keyof typeof this.buttons)[]) {
      this.buttons[k].setScrollFactor(0).setDepth(201);
    }
  }

  private makeSideButton(emoji: string, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setSize(58, 58);
    const bg = this.add.circle(0, 0, 28, 0xffffff, 0.95);
    bg.setStrokeStyle(2, 0xdddddd);
    c.add(bg);
    const ic = this.add.text(0, -4, emoji, { fontSize: '24px' }).setOrigin(0.5);
    c.add(ic);
    const lb = this.add.text(0, 18, label, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '10px',
      color: '#444',
    }).setOrigin(0.5);
    c.add(lb);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => bg.setFillStyle(0xfff2b3, 0.95));
    c.on('pointerout', () => bg.setFillStyle(0xffffff, 0.95));
    c.on('pointerdown', () => {
      bg.setScale(0.9);
      this.tweens.add({ targets: bg, scale: 1, duration: 160, ease: 'Back.easeOut' });
      onClick();
    });
    return c;
  }

  // ---------------- 面板 ----------------
  private initPanels(): void {
    this.panels = {
      shop: this.createShopPanel(),
      inventory: this.createInventoryPanel(),
      bed: this.createBedPanel(),
      toast: this.add.text(0, 0, '', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#fff',
        backgroundColor: '#000000cc',
        padding: { x: 16, y: 10 },
      }).setScrollFactor(0).setDepth(400).setOrigin(0.5, 0).setVisible(false),
    };
    Object.values(this.panels).forEach((p) => {
      if (p && 'setScrollFactor' in p) p.setScrollFactor(0);
    });
    (['shop', 'inventory', 'bed'] as const).forEach((k) => this.panels[k].setVisible(false).setDepth(300));
  }

  private createShopPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const { width, height } = this.scale;
    const w = Math.min(width - 40, 460);
    const h = Math.min(height - 200, 520);
    const bg = this.add.rectangle(0, 0, w, h, 0xffffff, 0.98);
    bg.setStrokeStyle(2, 0xe0cfa0);
    c.add(bg);
    const title = this.add.text(-w / 2 + 22, -h / 2 + 22, '🛒 皮埃尔的杂货店', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#2c3e50',
    });
    c.add(title);
    const close = this.add.text(w / 2 - 22, -h / 2 + 22, '✕', {
      fontSize: '24px',
      color: '#888',
    }).setOrigin(1, 0);
    close.setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.togglePanel('shop'));
    c.add(close);

    // 种子列表
    const y0 = -h / 2 + 72;
    const cropIds = Object.keys(CROPS);
    const rowH = 68;
    const cardW = w - 56;
    const list = this.add.container(0, y0);
    for (let i = 0; i < cropIds.length; i++) {
      const id = cropIds[i];
      const crop = CROPS[id];
      const row = this.add.container(0, i * rowH);
      row.setSize(cardW, rowH - 8);

      const rowBg = this.add.rectangle(0, 0, cardW, rowH - 8, 0xfffaf0);
      rowBg.setStrokeStyle(1, 0xe8dbb8);
      row.add(rowBg);

      const emoji = this.add.text(-cardW / 2 + 22, 0, crop.emoji, { fontSize: '30px' })
        .setOrigin(0, 0.5);
      row.add(emoji);

      const info = this.add.text(-cardW / 2 + 70, -16, '', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#333',
      });
      const s = SEASON_INFO[this.state.season];
      const canPlant = canPlantInSeason(crop.season, this.state.season);
      info.setText(
        [
          `${crop.name}${canPlant ? '' : `  ❌不适于${s.name}季`}`,
          `💰买入 ${crop.seedPrice}金 · 收获售价 ${crop.sellPrice}金 · 成长 ${crop.growthDays}天`,
        ].join('\n')
      );
      row.add(info);

      const buyCount = this.state.seeds[id] || 0;
      const buyBtnText = this.add.text(cardW / 2 - 18, 0, `买入\n(-${crop.seedPrice}) [${buyCount}]`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: canPlant ? '#fff' : '#aaa',
        align: 'center',
      }).setOrigin(1, 0.5);
      const btn = this.add.rectangle(cardW / 2 - 18, 0, 94, 50, canPlant ? 0x27ae60 : 0xcccccc);
      btn.setStrokeStyle(1, canPlant ? 0x1e8449 : 0xaaaaaa);
      btn.setInteractive({ useHandCursor: !!canPlant });
      btn.on('pointerdown', () => {
        if (!canPlant) {
          this.showToast(`❌ ${crop.name}不能在${s.name}季种植`);
          return;
        }
        if (this.state.money < crop.seedPrice) {
          this.showToast('❌ 金币不足');
          return;
        }
        this.state.money -= crop.seedPrice;
        this.state.seeds[id] = (this.state.seeds[id] || 0) + 1;
        refreshBuyBtn();
        if (this.state.selectedTool === 'seed') {
          // 切到最新种子
          this.state.selectedSeed = id;
        }
        this.updateAll();
        this.refreshShopPanel();
        this.showToast(`✅ 购入 ${crop.name}种子 x1`);
      });
      row.add(btn);
      buyBtnText.setDepth(1);
      row.add(buyBtnText);

      // 更新购入数量显示
      const refreshBuyBtn = () => {
        const c_ = this.state.seeds[id] || 0;
        buyBtnText.setText(`买入\n(-${crop.seedPrice}) [${c_}]`);
      };
      refreshBuyBtn();

      row.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -(rowH - 8) / 2, cardW, rowH - 8), Phaser.Geom.Rectangle.Contains);
      row.on('pointerover', () => rowBg.setFillStyle(0xfff4e0));
      row.on('pointerout', () => rowBg.setFillStyle(0xfffaf0));
      // 点击选中种子
      row.on('pointerdown', (p: Phaser.Input.Pointer, _x: unknown, _y: unknown, evt: unknown) => {
        // 简单判断是否点在购买按钮区域内（btn右侧居中 x=cardW/2-18, size=94x50）
        const rowBounds = row.getBounds();
        const clickedBtn = (p.position.x >= rowBounds.right - 18 - 47) && (p.position.x <= rowBounds.right - 18 + 47)
          && (p.position.y >= rowBounds.centerY - 25) && (p.position.y <= rowBounds.centerY + 25);
        if (!clickedBtn) {
          this.state.selectedSeed = id;
          this.selectTool(this.toolsList.indexOf('seed'));
          this.togglePanel('shop');
          this.showToast(`🌱 已选择 ${crop.name} 种子`);
        }
        (evt as { stopPropagation?: () => void })?.stopPropagation?.();
      });

      list.add(row);
    }
    list.setData('cropIds', cropIds);
    list.setData('w', cardW);
    list.setData('rowH', rowH);
    c.add(list);

    c.setData('bg', bg);
    c.setData('title', title);
    c.setData('close', close);
    c.setData('list', list);
    return c;
  }

  private refreshShopPanel(): void {
    const list = this.panels.shop.getData('list') as Phaser.GameObjects.Container;
    // 仅重绘：销毁并重建
    const parent = this.panels.shop;
    const bg = parent.getData('bg') as Phaser.GameObjects.Rectangle;
    const w = bg.width;
    const h = bg.height;
    list.removeAll(true);
    const y0 = -h / 2 + 72;
    list.setY(y0);
    const cropIds = list.getData('cropIds') as string[];
    const rowH = list.getData('rowH') as number;
    const cardW = list.getData('w') as number;

    for (let i = 0; i < cropIds.length; i++) {
      const id = cropIds[i];
      const crop = CROPS[id];
      const row = this.add.container(0, i * rowH);
      const rowBg = this.add.rectangle(0, 0, cardW, rowH - 8, 0xfffaf0);
      rowBg.setStrokeStyle(1, 0xe8dbb8);
      row.add(rowBg);

      const emoji = this.add.text(-cardW / 2 + 22, 0, crop.emoji, { fontSize: '30px' })
        .setOrigin(0, 0.5);
      row.add(emoji);

      const canPlant = canPlantInSeason(crop.season, this.state.season);
      const s = SEASON_INFO[this.state.season];
      const info = this.add.text(-cardW / 2 + 70, -16,
        `${crop.name}${canPlant ? '' : `  ❌不适于${s.name}季`}\n💰买入 ${crop.seedPrice}金 · 收获售价 ${crop.sellPrice}金 · 成长 ${crop.growthDays}天`,
        { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '14px', color: '#333' });
      row.add(info);

      const buyCount = this.state.seeds[id] || 0;
      const btnBg = this.add.rectangle(cardW / 2 - 18, 0, 94, 50, canPlant ? 0x27ae60 : 0xcccccc);
      btnBg.setStrokeStyle(1, canPlant ? 0x1e8449 : 0xaaaaaa);
      btnBg.setInteractive({ useHandCursor: !!canPlant });
      const buyBtnText = this.add.text(cardW / 2 - 18, 0, `买入\n(-${crop.seedPrice}) [${buyCount}]`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '13px',
        color: canPlant ? '#fff' : '#aaa', align: 'center',
      }).setOrigin(1, 0.5).setDepth(1);
      btnBg.on('pointerdown', () => {
        if (!canPlant) { this.showToast(`❌ ${crop.name}不能在${s.name}季种植`); return; }
        if (this.state.money < crop.seedPrice) { this.showToast('❌ 金币不足'); return; }
        this.state.money -= crop.seedPrice;
        this.state.seeds[id] = (this.state.seeds[id] || 0) + 1;
        if (this.state.selectedTool === 'seed') this.state.selectedSeed = id;
        this.updateAll();
        this.refreshShopPanel();
        this.showToast(`✅ 购入 ${crop.name}种子 x1`);
      });
      row.add(btnBg);
      row.add(buyBtnText);
      row.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -(rowH - 8) / 2, cardW, rowH - 8), Phaser.Geom.Rectangle.Contains);
      row.on('pointerover', () => rowBg.setFillStyle(0xfff4e0));
      row.on('pointerout', () => rowBg.setFillStyle(0xfffaf0));
      row.on('pointerdown', (p: Phaser.Input.Pointer, _x: unknown, _y: unknown, evt: unknown) => {
        const rowBounds = row.getBounds();
        const clickedBtn = (p.position.x >= rowBounds.right - 18 - 47) && (p.position.x <= rowBounds.right - 18 + 47)
          && (p.position.y >= rowBounds.centerY - 25) && (p.position.y <= rowBounds.centerY + 25);
        if (!clickedBtn) {
          this.state.selectedSeed = id;
          this.selectTool(this.toolsList.indexOf('seed'));
          this.togglePanel('shop');
          this.showToast(`🌱 已选择 ${crop.name} 种子`);
        }
        (evt as { stopPropagation?: () => void })?.stopPropagation?.();
      });
      list.add(row);
    }
  }

  private createInventoryPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const { width, height } = this.scale;
    const w = Math.min(width - 40, 460);
    const h = Math.min(height - 200, 520);
    const bg = this.add.rectangle(0, 0, w, h, 0xffffff, 0.98);
    bg.setStrokeStyle(2, 0xcfa0e0);
    c.add(bg);
    const title = this.add.text(-w / 2 + 22, -h / 2 + 22, '🎒 背包 & 种子', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '22px',
      fontStyle: 'bold', color: '#2c3e50',
    });
    c.add(title);
    const close = this.add.text(w / 2 - 22, -h / 2 + 22, '✕', { fontSize: '24px', color: '#888' }).setOrigin(1, 0);
    close.setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.togglePanel('inventory'));
    c.add(close);

    // 卖出提示
    const sellHint = this.add.text(0, -h / 2 + 60, '点击作物即可出售', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '12px', color: '#888',
    }).setOrigin(0.5);
    c.add(sellHint);

    const content = this.add.container(0, 0);
    c.add(content);
    c.setData('bg', bg);
    c.setData('content', content);
    c.on('destroy', () => {});
    return c;
  }

  private refreshInventoryPanel(): void {
    const c = this.panels.inventory;
    const content = c.getData('content') as Phaser.GameObjects.Container;
    content.removeAll(true);
    const bg = c.getData('bg') as Phaser.GameObjects.Rectangle;
    const w = bg.width;
    const h = bg.height;
    const s = this.state;
    const items: { id: string; emoji: string; name: string; count: number; price?: number }[] = [];
    // 种子
    for (const id of Object.keys(s.seeds)) {
      if (s.seeds[id] > 0) {
        items.push({ id: 'seed:' + id, emoji: '🌱', name: `${CROPS[id].name}种子`, count: s.seeds[id] });
      }
    }
    // 收获物
    for (const id of Object.keys(s.inventory)) {
      if (s.inventory[id] > 0 && CROPS[id]) {
        items.push({
          id: 'crop:' + id,
          emoji: CROPS[id].emoji,
          name: CROPS[id].name,
          count: s.inventory[id],
          price: CROPS[id].sellPrice,
        });
      }
    }
    if (items.length === 0) {
      const empty = this.add.text(0, 0, '空空如也...\n去商店买种子，然后种田收获吧！', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '16px',
        color: '#aaa', align: 'center',
      }).setOrigin(0.5);
      content.add(empty);
      return;
    }
    const cols = 3;
    const cellSize = 100;
    const gap = 10;
    const startX = -((cols * cellSize + (cols - 1) * gap) / 2) + cellSize / 2;
    let top = -h / 2 + 110;
    items.forEach((it, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cellSize + gap);
      const y = top + row * (cellSize + gap) + cellSize / 2;
      const cell = this.add.container(x, y);
      const cellBg = this.add.rectangle(0, 0, cellSize, cellSize, 0xfffaf0);
      cellBg.setStrokeStyle(1, 0xe0e0e0);
      cell.add(cellBg);
      const ic = this.add.text(0, -8, it.emoji, { fontSize: it.id.startsWith('seed:') ? '32px' : '36px' }).setOrigin(0.5);
      cell.add(ic);
      const nm = this.add.text(0, 20, it.name, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '12px', color: '#333',
      }).setOrigin(0.5);
      cell.add(nm);
      const cnt = this.add.text(-cellSize / 2 + 8, cellSize / 2 - 8, `x${it.count}`, {
        fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#2c3e50',
      }).setOrigin(0, 1);
      cell.add(cnt);
      if (it.price) {
        const price = this.add.text(cellSize / 2 - 8, cellSize / 2 - 8, `💰${it.price}`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#b8860b',
        }).setOrigin(1, 1);
        cell.add(price);
        cell.setInteractive(new Phaser.Geom.Rectangle(-cellSize / 2, -cellSize / 2, cellSize, cellSize), Phaser.Geom.Rectangle.Contains);
        cell.input!.cursor = 'pointer';
        cell.on('pointerover', () => cellBg.setFillStyle(0xfff4dc));
        cell.on('pointerout', () => cellBg.setFillStyle(0xfffaf0));
        cell.on('pointerdown', () => {
          const cropId = it.id.split(':')[1];
          if ((s.inventory[cropId] || 0) <= 0) return;
          s.inventory[cropId]--;
          s.money += it.price!;
          this.showToast(`💰 出售 ${CROPS[cropId].name} +${it.price}金`);
          this.updateAll();
          this.refreshInventoryPanel();
        });
      } else {
        cell.setInteractive(new Phaser.Geom.Rectangle(-cellSize / 2, -cellSize / 2, cellSize, cellSize), Phaser.Geom.Rectangle.Contains);
        cell.input!.cursor = 'pointer';
        cell.on('pointerover', () => cellBg.setFillStyle(0xfff4dc));
        cell.on('pointerout', () => cellBg.setFillStyle(0xfffaf0));
        cell.on('pointerdown', () => {
          const seedId = it.id.split(':')[1];
          this.state.selectedSeed = seedId;
          this.selectTool(this.toolsList.indexOf('seed'));
          this.togglePanel('inventory');
          this.showToast(`🌱 已选择 ${CROPS[seedId].name}种子`);
        });
      }
      content.add(cell);
    });
  }

  private createBedPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const { width, height } = this.scale;
    const w = Math.min(width - 40, 420);
    const h = 280;
    const bg = this.add.rectangle(0, 0, w, h, 0xffffff, 0.98);
    bg.setStrokeStyle(2, 0x9fc5e8);
    c.add(bg);
    const title = this.add.text(0, -h / 2 + 30, '🛏️ 上床睡觉（进入下一天）', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '22px',
      fontStyle: 'bold', color: '#2c3e50',
    }).setOrigin(0.5);
    c.add(title);
    const text = this.add.text(0, -20,
      '🌙 睡觉可以恢复所有体力，\n农作物根据浇水情况生长一天，\n时间和季节都会前进。',
      {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '15px',
        color: '#555', align: 'center', lineSpacing: 6,
      }
    ).setOrigin(0.5);
    c.add(text);

    const yesBtn = this.add.container(-80, 70);
    const yesBg = this.add.rectangle(0, 0, 130, 50, 0x2e86de).setStrokeStyle(2, 0x1e5fa8);
    const yesT = this.add.text(0, 0, '✅ 睡觉', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '18px',
      color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    yesBtn.add([yesBg, yesT]);
    yesBtn.setSize(130, 50);
    yesBtn.setInteractive({ useHandCursor: true });
    yesBtn.on('pointerover', () => yesBg.setFillStyle(0x54a0ff));
    yesBtn.on('pointerout', () => yesBg.setFillStyle(0x2e86de));
    yesBtn.on('pointerdown', () => this.advanceDay());
    c.add(yesBtn);

    const noBtn = this.add.container(80, 70);
    const noBg = this.add.rectangle(0, 0, 130, 50, 0x95a5a6).setStrokeStyle(2, 0x7f8c8d);
    const noT = this.add.text(0, 0, '❌ 取消', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '18px',
      color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    noBtn.add([noBg, noT]);
    noBtn.setSize(130, 50);
    noBtn.setInteractive({ useHandCursor: true });
    noBtn.on('pointerover', () => noBg.setFillStyle(0xbdc3c7));
    noBtn.on('pointerout', () => noBg.setFillStyle(0x95a5a6));
    noBtn.on('pointerdown', () => this.togglePanel('bed'));
    c.add(noBtn);

    const close = this.add.text(w / 2 - 22, -h / 2 + 22, '✕', { fontSize: '24px', color: '#888' }).setOrigin(1, 0);
    close.setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.togglePanel('bed'));
    c.add(close);

    c.setData('bg', bg);
    return c;
  }

  private positionPanels(): void {
    const { width, height } = this.scale;
    for (const k of ['shop', 'inventory', 'bed'] as const) {
      const p = this.panels[k];
      p.setPosition(width / 2, height / 2);
      const bg = p.getData('bg') as Phaser.GameObjects.Rectangle;
      if (bg) {
        // 适配边界
        bg.setSize(Math.min(bg.width, width - 40), Math.min(bg.height, height - 240));
      }
    }
    this.panels.toast.setPosition(width / 2, 110);
  }

  private togglePanel(which: UIState): void {
    if (which === 'save') return; // 单独处理
    const opening = this.panelOpen !== which ? which : 'closed';
    this.panelOpen = 'closed';
    this.panels.shop.setVisible(false);
    this.panels.inventory.setVisible(false);
    this.panels.bed.setVisible(false);
    this.positionPanels();
    if (opening !== 'closed') {
      this.panelOpen = opening;
      const target = this.panels[opening];
      target.setVisible(true);
      if (opening === 'inventory') this.refreshInventoryPanel();
      if (opening === 'shop') this.refreshShopPanel();
      // 简单淡入
      target.setAlpha(0);
      this.tweens.add({ targets: target, alpha: 1, duration: 180, ease: 'Cubic.easeOut' });
    }
  }

  private onSaveClick(): void {
    saveGame(this.state);
    this.showToast('💾 游戏已保存！');
    // 按钮视觉反馈
    const c = this.buttons.save;
    this.tweens.add({ targets: c, scale: 1.15, yoyo: true, duration: 160, ease: 'Sine.easeOut' });
  }

  // ---------------- 时间推进 ----------------
  private tickTime(): void {
    if (this.panelOpen !== 'closed') return;
    if (this.inputLocked) return;
    this.timeAccumulator += 200;
    if (this.timeAccumulator >= this.timeSpeedMs) {
      this.timeAccumulator -= this.timeSpeedMs;
      this.state.timeOfDay += 0.5; // 30分钟
      // 到达凌晨2点强制睡觉
      if (this.state.timeOfDay >= 26) {
        this.showToast('😴 你太累了，昏昏睡去...');
        this.time.delayedCall(800, () => this.advanceDay(true));
      }
      this.updateTimeText();
    }
  }

  private advanceDay(forced = false): void {
    if (this.panelOpen === 'bed') this.togglePanel('bed');
    this.inputLocked = true;
    // 夜晚过渡
    this.cameras.main.fadeOut(600, 10, 10, 40);
    this.time.delayedCall(650, () => {
      // 推进作物生长
      this.growCrops();
      // 日期
      this.state.day += 1;
      if (this.state.day > 28) {
        this.state.day = 1;
        const newSeason = nextSeason(this.state.season);
        if (newSeason === 'spring') this.state.year += 1;
        this.state.season = newSeason;
        // 换季清除上季作物
        this.clearOutOfSeasonCrops();
        this.showToast(`🌿 进入${SEASON_INFO[this.state.season].name}季！`);
        this.initBackground();
      }
      // 天气
      this.state.weather = randomWeather(this.state.season);
      // 时间重置
      this.state.timeOfDay = 6;
      this.timeAccumulator = 0;
      // 体力恢复
      this.state.energy = this.state.maxEnergy;
      // 如果下雨，自动给所有已浇水或带种子的格子补一次水
      if (this.state.weather === 'rainy') {
        for (let r = 0; r < this.state.tiles.length; r++) {
          for (let c = 0; c < this.state.tiles[r].length; c++) {
            const t = this.state.tiles[r][c];
            if (t.state >= TileState.SEEDED && !t.wetToday) {
              t.wetToday = true;
            }
          }
        }
      }
      // 清除wetToday，昨天已计算
      for (let r = 0; r < this.state.tiles.length; r++) {
        for (let c = 0; c < this.state.tiles[r].length; c++) {
          this.state.tiles[r][c].wetToday = false;
        }
      }
      // 重绘
      this.farmRenderer.render(this.state.tiles, this.state.season);
      this.cameras.main.fadeIn(600, 10, 10, 40);
      saveGame(this.state);
      this.updateAll();
      this.showToast(forced ? '☠️ 体力透支，被送回了床上...' : '☀️ 新的一天开始了！');
      this.inputLocked = false;
    });
  }

  private growCrops(): void {
    for (let r = 0; r < FARM_ROWS; r++) {
      for (let c = 0; c < FARM_COLS; c++) {
        const tile = this.state.tiles[r][c];
        if (tile.state < TileState.SEEDED || !tile.cropId) continue;
        const crop = CROPS[tile.cropId];
        if (!crop) continue;
        // 只有昨天浇过水才长
        const wateredYesterday = (tile as unknown as { _wateredYesterday?: boolean })._wateredYesterday;
        const grown = wateredYesterday || this.state.weather === 'rainy';
        if (grown) {
          tile.growthProgress += Math.floor(100 / crop.growthDays);
          if (tile.growthProgress >= 100) {
            tile.state = TileState.READY;
            tile.stage = 4;
          } else if (tile.growthProgress >= 75) {
            tile.state = TileState.GROWING;
            tile.stage = 3;
          } else if (tile.growthProgress >= 40) {
            tile.state = TileState.GROWING;
            tile.stage = 2;
          } else {
            tile.state = TileState.WATERED;
            tile.stage = 1;
          }
        }
      }
    }
    // 重置昨天浇水标记，并从wetToday转移为_wateredYesterday
    for (let r = 0; r < FARM_ROWS; r++) {
      for (let c = 0; c < FARM_COLS; c++) {
        const t = this.state.tiles[r][c] as Tile & { _wateredYesterday?: boolean };
        t._wateredYesterday = t.wetToday;
      }
    }
  }

  private clearOutOfSeasonCrops(): void {
    for (let r = 0; r < FARM_ROWS; r++) {
      for (let c = 0; c < FARM_COLS; c++) {
        const t = this.state.tiles[r][c];
        if (t.cropId) {
          const crop = CROPS[t.cropId];
          if (crop && !canPlantInSeason(crop.season, this.state.season) && t.state !== TileState.READY) {
            // 未收获的换季枯萎 -> 回到翻地状态
            t.state = TileState.TILLED;
            t.cropId = undefined;
            t.stage = 0;
            t.growthProgress = 0;
            t.waterCount = 0;
          }
        }
      }
    }
  }

  // ---------------- 输入处理 ----------------
  private onKey(e: KeyboardEvent): void {
    if (this.panelOpen !== 'closed') {
      if (e.key === 'Escape') this.togglePanel('closed');
      return;
    }
    const key = e.key.toLowerCase();
    const map: Record<string, [number, number]> = {
      'w': [0, -1], 'arrowup': [0, -1],
      's': [0, 1], 'arrowdown': [0, 1],
      'a': [-1, 0], 'arrowleft': [-1, 0],
      'd': [1, 0], 'arrowright': [1, 0],
    };
    if (map[key]) {
      const [dc, dr] = map[key];
      this.tryMovePlayer(dc, dr);
      e.preventDefault();
    } else if (key === '1') this.selectTool(0);
    else if (key === '2') this.selectTool(1);
    else if (key === '3') this.selectTool(2);
    else if (key === '4') this.selectTool(3);
    else if (key === '5') this.selectTool(4);
    else if (key === ' ') {
      // 空格：用工具朝向当前或使用
      this.useToolOn(this.player.gridC, this.player.gridR + 1);
    }
  }

  private onTap(p: Phaser.Input.Pointer): void {
    if (this.inputLocked) return;
    // 忽略面板开启
    if (this.panelOpen !== 'closed') return;
    // 将点击坐标转换为世界坐标（考虑camera缩放）
    const worldX = p.position.x / this.cameras.main.zoom + this.cameras.main.scrollX;
    const worldY = p.position.y / this.cameras.main.zoom + this.cameras.main.scrollY;
    // 点击到UI层？因为UI scrollFactor=0 且 camera scroll=0；它们世界坐标0~width, 0~height，与tap一致。
    // 我们将忽略任何与UI（scrollFactor=0）相交的点击（Phaser会命中测试）
    // 但为了简单，我们直接判断是否点在农场范围
    const c = Math.floor((worldX - this.baseX) / TILE_SIZE);
    const r = Math.floor((worldY - this.baseY) / TILE_SIZE);
    if (r < 0 || r >= FARM_ROWS || c < 0 || c >= FARM_COLS) return;

    // 玩家移动 / 使用工具：如果点中相邻格则移动后执行；否则单格移动靠近
    const dc = c - this.player.gridC;
    const dr = r - this.player.gridR;
    const dist = Math.abs(dc) + Math.abs(dr);

    if (dist === 0) {
      // 点在自己身上：使用工具对下方/前方
      this.useToolOn(c, r);
      return;
    }
    if (dist === 1) {
      // 相邻 -> 先朝该方向使用工具（如果该格可作用），否则移动到该格
      const wantUse = this.shouldUseToolFirst(r, c);
      if (wantUse) {
        this.useToolOn(c, r);
      } else {
        this.tryMovePlayer(dc, dr);
      }
      return;
    }
    // 远处：走一步靠近
    let stepC = 0, stepR = 0;
    if (Math.abs(dc) >= Math.abs(dr)) stepC = Math.sign(dc);
    else stepR = Math.sign(dr);
    // 但要合法
    if (this.isBlocked(this.player.gridC + stepC, this.player.gridR + stepR)) {
      if (stepC !== 0) { stepC = 0; stepR = Math.sign(dr); }
      else { stepR = 0; stepC = Math.sign(dc); }
    }
    if (!this.isBlocked(this.player.gridC + stepC, this.player.gridR + stepR)) {
      this.tryMovePlayer(stepC, stepR);
    }
  }

  private shouldUseToolFirst(r: number, c: number): boolean {
    const tile = this.state.tiles[r][c];
    const tool = this.state.selectedTool;
    if (tool === 'hand') return tile.state === TileState.READY;
    if (tool === 'hoe') return tile.state === TileState.GRASS;
    if (tool === 'seed') return tile.state === TileState.TILLED && (this.state.seeds[this.state.selectedSeed] || 0) > 0;
    if (tool === 'can') return tile.state >= TileState.SEEDED && !tile.wetToday;
    if (tool === 'axe') return tile.state === TileState.GRASS;
    return false;
  }

  private isBlocked(c: number, r: number): boolean {
    if (c < 0 || c >= FARM_COLS || r < 0 || r >= FARM_ROWS) return true;
    return false;
  }

  private tryMovePlayer(dc: number, dr: number, final: () => void = () => {}): void {
    if (this.inputLocked) return;
    if (this.player.moving) return;
    const tc = this.player.gridC + dc;
    const tr = this.player.gridR + dr;
    if (this.isBlocked(tc, tr)) return;
    if (this.state.energy <= 0) {
      this.showToast('😫 体力耗尽！去睡觉吧');
      return;
    }
    let dir: 'up' | 'down' | 'left' | 'right' = 'down';
    if (dr < 0) dir = 'up';
    else if (dr > 0) dir = 'down';
    else if (dc < 0) dir = 'left';
    else dir = 'right';
    this.player.moveTo(tc, tr, this.baseX, this.baseY, () => {
      // 时间消耗一点点：走一步=5分钟
      this.state.timeOfDay += 1 / 12;
      // 体力：极少量
      this.state.energy = Math.max(0, this.state.energy - 0.2);
      this.updateTimeText();
      this.drawEnergyBar();
      final();
    });
    void dir;
  }

  private useToolOn(c: number, r: number): void {
    // 玩家必须在相邻或同一格
    const dc = c - this.player.gridC;
    const dr = r - this.player.gridR;
    if (Math.abs(dc) + Math.abs(dr) > 1) return;
    const tool = this.state.selectedTool;
    let dir: 'up' | 'down' | 'left' | 'right' = 'down';
    if (dr < 0) dir = 'up'; else if (dr > 0) dir = 'down'; else if (dc < 0) dir = 'left'; else if (dc > 0) dir = 'right';

    const tile = this.state.tiles[r][c];
    let success = false;
    let kind: 'hoe' | 'water' | 'seed' | 'harvest' = 'hoe';

    if (tool === 'hoe') {
      if (tile.state === TileState.GRASS) {
        if (this.consumeEnergy(3)) {
          tile.state = TileState.TILLED;
          this.state.timeOfDay += 1 / 6;
          success = true;
          kind = 'hoe';
        }
      } else {
        this.showToast('这里已经翻过啦');
      }
    } else if (tool === 'can') {
      if (tile.state >= TileState.SEEDED && tile.cropId) {
        if (tile.wetToday) { this.showToast('💦 今天已经浇过啦'); }
        else if (this.consumeEnergy(2)) {
          tile.wetToday = true;
          tile.waterCount++;
          tile.state = TileState.WATERED;
          this.state.timeOfDay += 1 / 6;
          success = true;
          kind = 'water';
        }
      } else if (tile.state === TileState.TILLED) {
        this.showToast('🌱 这里还没播种呢');
      } else {
        this.showToast('🚿 这里不需要浇水');
      }
    } else if (tool === 'seed') {
      if (tile.state === TileState.TILLED) {
        const seedId = this.state.selectedSeed;
        const count = this.state.seeds[seedId] || 0;
        const crop = CROPS[seedId];
        if (count <= 0) this.showToast(`❌ 没有${crop.name}种子了，去商店买吧`);
        else if (!canPlantInSeason(crop.season, this.state.season)) {
          this.showToast(`❌ ${crop.name}不适合在${SEASON_INFO[this.state.season].name}季种植`);
        } else if (this.consumeEnergy(2)) {
          this.state.seeds[seedId] = count - 1;
          tile.state = TileState.SEEDED;
          tile.cropId = seedId;
          tile.stage = 0;
          tile.growthProgress = 0;
          tile.waterCount = 0;
          this.state.timeOfDay += 1 / 6;
          success = true;
          kind = 'seed';
        }
      } else {
        this.showToast('🌱 需要在翻好的地上播种');
      }
    } else if (tool === 'axe') {
      if (tile.state === TileState.GRASS) {
        if (this.consumeEnergy(1)) {
          tile.state = TileState.TILLED;
          // 小概率获得干草（10金等价物）
          if (Math.random() < 0.3) {
            this.state.money += 5;
            this.showToast('🪓 清理杂草 +5金');
          }
          this.state.timeOfDay += 1 / 6;
          success = true;
          kind = 'hoe';
        }
      } else {
        this.showToast('这里没东西可砍');
      }
    } else if (tool === 'hand') {
      if (tile.state === TileState.READY && tile.cropId) {
        const crop = CROPS[tile.cropId];
        this.state.inventory[crop.id] = (this.state.inventory[crop.id] || 0) + 1;
        // 清除作物
        tile.state = TileState.TILLED;
        tile.cropId = undefined;
        tile.stage = 0;
        tile.growthProgress = 0;
        tile.waterCount = 0;
        this.state.timeOfDay += 1 / 6;
        success = true;
        kind = 'harvest';
        this.showToast(`🎉 收获了 ${crop.emoji} ${crop.name}！ (卖出 ${crop.sellPrice}金/个)`);
      } else {
        this.showToast('✋ 这里还没成熟呢');
      }
    }

    if (success) {
      this.player.useToolAnimation(dir, () => {
        this.farmRenderer.playTileEffect(r, c, kind);
      });
      // 刷新显示
      this.farmRenderer.updateTile(tile, r, c, this.state.season);
      this.updateAll();
    } else {
      // 没体力/不允许
      if (this.state.energy <= 0) this.showToast('😫 体力耗尽！去睡觉吧');
    }
  }

  private consumeEnergy(n: number): boolean {
    if (this.state.energy < n) return false;
    this.state.energy -= n;
    this.drawEnergyBar();
    return true;
  }

  // ---------------- 更新 ----------------
  private updateAll(): void {
    this.updateTimeText();
    this.updateTopInfo();
    this.drawEnergyBar();
    this.updateToolbarSelection();
    this.positionFixedUI();
    this.positionPanels();
  }

  private updateTimeText(): void {
    const s = this.state;
    const info = SEASON_INFO[s.season];
    const emo: Record<string, string> = { spring: '🌸', summer: '☀️', fall: '🍁', winter: '❄️' };
    this.seasonDayText?.setText(`${emo[s.season]} 第${s.year}年 ${info.name}季 第${s.day}/28天`);
    this.timeText?.setText(formatTime(s.timeOfDay));
    const wEmoji: Record<Weather, string> = { sunny: '☀️', rainy: '🌧️', cloudy: '⛅' };
    this.weatherIcon?.setText(wEmoji[s.weather]);
  }

  private updateTopInfo(): void {
    this.moneyText?.setText(`💰 ${this.state.money} 金`);
  }

  // ---------------- 提示 ----------------
  private toastTimer?: Phaser.Time.TimerEvent;
  private showToast(msg: string, duration = 1800): void {
    const t = this.panels.toast;
    t.setText(msg);
    t.setVisible(true);
    t.setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
    });
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(duration, () => {
      this.tweens.add({
        targets: t,
        alpha: 0,
        duration: 250,
        ease: 'Cubic.easeIn',
        onComplete: () => t.setVisible(false),
      });
    });
  }
}
