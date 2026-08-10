// HUD 渲染器 · 橘子地牢
// DOM 叠层渲染玩家状态、小地图、背包栏、模态对话框
// Orgc 橘子工作室

import { GameState } from '../systems/GameState';
import { ITEMS, MAP_W, MAP_H, TILE_TYPE, ENEMY_TYPES, UPGRADES, SHOP_ITEMS } from '../config';
import type { ShopItem } from '../config';
import type { DungeonState } from '../types';

export class HUD {
  private state: GameState;
  private hpBar: HTMLElement;
  private hpValue: HTMLElement;
  private xpBar: HTMLElement;
  private xpValue: HTMLElement;
  private spBar: HTMLElement;
  private spValue: HTMLElement;
  private floorNum: HTMLElement;
  private goldNum: HTMLElement;
  private killNum: HTMLElement;
  private lvlNum: HTMLElement;
  private hotbar: HTMLElement;
  private minimap: HTMLCanvasElement;
  private mmCtx: CanvasRenderingContext2D;
  private toast: HTMLElement;
  private upgradeModal: HTMLElement;
  private upgradeList: HTMLElement;
  private deathModal: HTMLElement;
  private deathStats: HTMLElement;
  private restartBtn: HTMLElement;
  private toastTimer: number | null = null;
  private cooldownMul = 1.0;
  private shopModal: HTMLElement;
  private shopList: HTMLElement;
  private shopGold: HTMLElement;
  private shopCloseBtn: HTMLElement;
  private shopActive = false;
  private purchasedIds: Set<string> = new Set();

  constructor(state: GameState) {
    this.state = state;
    this.hpBar = document.getElementById('hp-bar')!;
    this.hpValue = document.getElementById('hp-value')!;
    this.xpBar = document.getElementById('xp-bar')!;
    this.xpValue = document.getElementById('xp-value')!;
    this.spBar = document.getElementById('sp-bar')!;
    this.spValue = document.getElementById('sp-value')!;
    this.floorNum = document.getElementById('floor-num')!;
    this.goldNum = document.getElementById('gold-num')!;
    this.killNum = document.getElementById('kill-num')!;
    this.lvlNum = document.getElementById('lvl-num')!;
    this.hotbar = document.getElementById('hotbar')!;
    this.minimap = document.getElementById('minimap') as HTMLCanvasElement;
    this.mmCtx = this.minimap.getContext('2d')!;
    this.toast = document.getElementById('toast')!;
    this.upgradeModal = document.getElementById('upgrade-modal')!;
    this.upgradeList = document.getElementById('upgrade-list')!;
    this.deathModal = document.getElementById('death-modal')!;
    this.deathStats = document.getElementById('death-stats')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.shopModal = document.getElementById('shop-modal')!;
    this.shopList = document.getElementById('shop-list')!;
    this.shopGold = document.getElementById('shop-gold')!;
    this.shopCloseBtn = document.getElementById('shop-close')!;

    this.restartBtn.addEventListener('click', () => {
      this.deathModal.classList.remove('show');
      window.location.reload();
    });
    this.shopCloseBtn.addEventListener('click', () => {
      this.closeShop();
    });
  }

  setCooldownMul(mul: number) {
    this.cooldownMul = mul;
  }

  update() {
    const p = this.state.player;
    const d = this.state.dungeon;
    // 状态条
    this.hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
    this.hpValue.textContent = `${Math.max(0, Math.floor(p.hp))}/${p.maxHp}`;
    this.xpBar.style.width = `${(p.xp / p.xpNext) * 100}%`;
    this.xpValue.textContent = `${p.xp}/${p.xpNext}`;
    this.spBar.style.width = `${Math.max(0, (p.sp / p.maxSp) * 100)}%`;
    this.spValue.textContent = `${Math.max(0, Math.floor(p.sp))}/${p.maxSp}`;
    // 数字
    this.floorNum.textContent = String(d.floor);
    this.goldNum.textContent = String(p.gold);
    this.killNum.textContent = String(p.killCount);
    this.lvlNum.textContent = String(p.level);
    // 背包栏
    this.renderHotbar();
    // 小地图
    this.renderMinimap();
    // 升级提示
    if (this.state.pendingUpgrade && !this.upgradeModal.classList.contains('show')) {
      this.showUpgradeModal();
    }
  }

  private renderHotbar() {
    // 显示前 5 个道具槽
    const slots = this.state.inventory.slice(0, 5);
    // 重建 DOM
    this.hotbar.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const slot = slots[i];
      const div = document.createElement('div');
      div.className = 'slot';
      if (slot) {
        const cfg = ITEMS[slot.itemId];
        const icon = document.createElement('span');
        icon.className = 'slot-icon';
        icon.textContent = cfg.icon;
        div.appendChild(icon);
        if (slot.count > 1) {
          const cnt = document.createElement('span');
          cnt.className = 'slot-count';
          cnt.textContent = String(slot.count);
          div.appendChild(cnt);
        }
        // 数字快捷键
        const key = document.createElement('span');
        key.style.cssText = 'position:absolute;top:0;left:2px;font-size:9px;color:#807060';
        key.textContent = String(i + 1);
        div.appendChild(key);
        div.title = `${cfg.name} - ${cfg.desc}`;
        div.addEventListener('click', () => {
          if (this.state.useItem(i)) {
            this.showToast(`使用了 ${cfg.name}`);
          }
        });
      } else {
        const key = document.createElement('span');
        key.style.cssText = 'position:absolute;top:0;left:2px;font-size:9px;color:#807060';
        key.textContent = String(i + 1);
        div.appendChild(key);
      }
      this.hotbar.appendChild(div);
    }
  }

  useSlot(index: number): boolean {
    if (index < 0 || index >= this.state.inventory.length) return false;
    return this.state.useItem(index);
  }

  private renderMinimap() {
    const d = this.state.dungeon;
    const ctx = this.mmCtx;
    const w = this.minimap.width;
    const h = this.minimap.height;
    // 缩放：把 MAP_W x MAP_H 缩放到 160x160
    const sx = w / MAP_W;
    const sy = h / MAP_H;
    ctx.fillStyle = '#0a0710';
    ctx.fillRect(0, 0, w, h);
    // 已访问房间附近的瓦片才显示
    const px = Math.floor(this.state.player.x / 16);
    const py = Math.floor(this.state.player.y / 16);
    const visRadius = 12;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const dx = x - px;
        const dy = y - py;
        if (dx * dx + dy * dy > visRadius * visRadius) continue;
        const t = d.tiles[y * MAP_W + x];
        let color = '#1a1218';
        if (t === TILE_TYPE.FLOOR) color = '#4a2838';
        else if (t === TILE_TYPE.DOOR) color = '#8a5020';
        else if (t === TILE_TYPE.STAIRS_DOWN) color = '#ffaa30';
        else if (t === TILE_TYPE.CHEST) color = '#c08030';
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
      }
    }
    // 玩家位置
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(Math.floor(px * sx) - 1, Math.floor(py * sy) - 1, 3, 3);
    // 敌人（仅显示附近）
    for (const e of d.enemies) {
      if (!e.alive) continue;
      const ex = Math.floor(e.x / 16);
      const ey = Math.floor(e.y / 16);
      const dx = ex - px;
      const dy = ey - py;
      if (dx * dx + dy * dy > visRadius * visRadius) continue;
      const cfg = ENEMY_TYPES[e.type];
      ctx.fillStyle = cfg.isBoss ? '#ff2020' : '#c04050';
      ctx.fillRect(Math.floor(ex * sx), Math.floor(ey * sy), 2, 2);
    }
  }

  showToast(msg: string, duration = 1500) {
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove('show');
    }, duration);
  }

  private showUpgradeModal() {
    this.upgradeList.innerHTML = '';
    // 随机抽 3 个升级
    const pool = [...UPGRADES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const choices = pool.slice(0, 3);
    for (const up of choices) {
      const item = document.createElement('div');
      item.className = 'upgrade-item';
      item.innerHTML = `<div class="title">${up.title}</div><div class="desc">${up.desc}</div>`;
      item.addEventListener('click', () => {
        this.state.applyUpgrade(up.id);
        if (up.id === 'cooldown') {
          this.cooldownMul *= 0.85;
        }
        this.upgradeModal.classList.remove('show');
        this.showToast(`已获得：${up.title}`);
      });
      this.upgradeList.appendChild(item);
    }
    this.upgradeModal.classList.add('show');
  }

  showDeath() {
    const time = Math.floor((Date.now() - this.state.startTime) / 1000);
    const min = Math.floor(time / 60);
    const sec = time % 60;
    this.deathStats.innerHTML = `
      你在第 <b style="color:#ffaa30">${this.state.dungeon.floor}</b> 层倒下<br>
      等级：<b style="color:#80c0ff">${this.state.player.level}</b> · 击杀：<b style="color:#ff8080">${this.state.totalKills}</b><br>
      金币：<b style="color:#ffe080">${this.state.totalGold}</b> · 用时：<b>${min}分${sec}秒</b>
    `;
    this.deathModal.classList.add('show');
    this.state.saveBest();
  }

  hideAllModals() {
    this.upgradeModal.classList.remove('show');
    this.deathModal.classList.remove('show');
    this.closeShop();
  }

  // ============ 商店 ============
  isShopOpen(): boolean {
    return this.shopActive;
  }

  openShop() {
    this.shopActive = true;
    this.purchasedIds.clear();  // 每次开店重置武器购买记录
    this.renderShop();
    this.shopModal.classList.add('show');
  }

  closeShop() {
    this.shopActive = false;
    this.shopModal.classList.remove('show');
  }

  private renderShop() {
    this.shopGold.textContent = `你的金币：${this.state.player.gold}`;
    this.shopList.innerHTML = '';
    for (const item of SHOP_ITEMS) {
      const soldOut = item.type === 'weapon' && this.purchasedIds.has(item.id);
      const canAfford = this.state.player.gold >= item.price && !soldOut;
      const div = document.createElement('div');
      div.className = 'upgrade-item';
      div.style.opacity = soldOut ? '0.4' : (canAfford ? '1' : '0.6');
      const priceColor = soldOut ? '#888' : (canAfford ? '#ffe080' : '#c06060');
      div.innerHTML = `
        <div class="title">${item.icon} ${item.name} <span style="float:right;color:${priceColor}">${soldOut ? '已售罄' : item.price + '金'}</span></div>
        <div class="desc">${item.desc}</div>
      `;
      if (canAfford) {
        div.addEventListener('click', () => this.buyItem(item));
      } else {
        div.style.cursor = 'default';
      }
      this.shopList.appendChild(div);
    }
  }

  private buyItem(item: ShopItem) {
    const p = this.state.player;
    if (p.gold < item.price) {
      this.showToast('金币不足');
      return;
    }
    p.gold -= item.price;
    if (item.type === 'weapon') {
      // 武器立即生效，标记已售罄
      const eff = item.weaponEffect || {};
      if (eff.attackUp) p.attack += eff.attackUp;
      if (eff.defenseUp) p.defense += eff.defenseUp;
      if (eff.speedUp) p.speed = Math.floor(p.speed * (1 + eff.speedUp));
      if (eff.heal) {
        p.maxHp += eff.heal;
        p.hp = p.maxHp;
      }
      this.purchasedIds.add(item.id);
      this.showToast(`购买了 ${item.name}！`);
    } else if (item.type === 'key' || item.type === 'material') {
      this.state.addItem(item.id, 1);
      this.showToast(`购买了 ${item.name}`);
    } else {
      // 药水加到背包
      this.state.addItem(item.id, 1);
      this.showToast(`购买了 ${item.name}`);
    }
    this.renderShop();  // 刷新显示
  }
}
