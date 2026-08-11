// DOM HUD 渲染 · 赤焰地牢
// 关键：默认所有 HUD 元素 pointer-events: none，只有按钮开启
import type { GameState } from '../systems/GameState';
import { UPGRADES } from '../config';

export class HUD {
  private s: GameState;

  private barHp: HTMLElement;
  private barSp: HTMLElement;
  private barXp: HTMLElement;
  private txtHp: HTMLElement;
  private txtSp: HTMLElement;
  private txtLv: HTMLElement;
  private txtXp: HTMLElement;
  private txtFloor: HTMLElement;
  private txtGold: HTMLElement;
  private txtKills: HTMLElement;
  private txtTime: HTMLElement;

  private dmgLayer: HTMLElement;
  private upgradeModal: HTMLElement;
  private upgradeList: HTMLElement;
  private deathModal: HTMLElement;
  private deathStats: HTMLElement;
  private btnRestart: HTMLElement;

  onUpgradePick?: (id: string) => void;
  onRestart?: () => void;

  constructor(state: GameState) {
    this.s = state;
    // 所有 DOM 元素都已经在 index.html 中存在（#hud 层）
    const $ = (id: string) => {
      const el = document.getElementById(id);
      if (!el) throw new Error('HUD 缺少元素: ' + id);
      return el;
    };
    this.barHp = $('bar-hp'); this.barSp = $('bar-sp'); this.barXp = $('bar-xp');
    this.txtHp = $('txt-hp'); this.txtSp = $('txt-sp');
    this.txtLv = $('txt-lv'); this.txtXp = $('txt-xp');
    this.txtFloor = $('txt-floor'); this.txtGold = $('txt-gold');
    this.txtKills = $('txt-kills'); this.txtTime = $('txt-time');
    this.dmgLayer = $('damage-layer');
    this.upgradeModal = $('upgrade-modal');
    this.upgradeList = $('upgrade-list');
    this.deathModal = $('death-modal');
    this.deathStats = $('death-stats');
    this.btnRestart = $('btn-restart');

    this.btnRestart.addEventListener('click', () => this.onRestart?.());
    this.update();
  }

  // ============ 渲染 HUD 数值 ============
  update() {
    const p = this.s.player;
    this.barHp.style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
    this.txtHp.textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`;
    this.barSp.style.width = Math.max(0, (p.sp / p.maxSp) * 100) + '%';
    this.txtSp.textContent = `${Math.max(0, Math.ceil(p.sp))}/${p.maxSp}`;
    this.txtLv.textContent = String(p.lv);
    this.barXp.style.width = Math.min(100, (p.xp / p.xpNext) * 100) + '%';
    this.txtXp.textContent = `${p.xp}/${p.xpNext}`;
    this.txtFloor.textContent = `第 ${this.s.floor} 层`;
    this.txtGold.textContent = `🪙 ${p.gold}`;
    this.txtKills.textContent = `💀 ${p.kills}`;
    const t = this.s.getPlaySeconds();
    const mm = Math.floor(t / 60).toString().padStart(2, '0');
    const ss = Math.floor(t % 60).toString().padStart(2, '0');
    this.txtTime.textContent = `⏱ ${mm}:${ss}`;
  }

  // ============ 伤害飘字 ============
  spawnDamage(x: number, y: number, dmg: number, kind: 'normal' | 'crit' | 'player' | 'heal') {
    const el = document.createElement('div');
    el.className = 'dmg-num ' + kind;
    el.textContent = (kind === 'heal' ? '+' : '') + dmg;
    // x,y 是世界坐标 → 屏幕坐标需要 canvas 滚动补偿，由 GameScene 传正确的 screenX/screenY
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.dmgLayer.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // ============ Toast 提示 ============
  showToast(msg: string, durationMs = 2000) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.getElementById('hud')!.appendChild(el);
    setTimeout(() => el.remove(), durationMs + 100);
  }

  // ============ 升级面板 ============
  showUpgradePick() {
    // 随机选 4 个升级
    const pool = [...UPGRADES];
    pool.sort(() => Math.random() - 0.5);
    const picks = pool.slice(0, 4);
    this.upgradeList.innerHTML = '';
    for (const up of picks) {
      const btn = document.createElement('div');
      btn.className = 'upgrade-btn';
      btn.innerHTML = `<div class="up-name">${up.name}</div><div class="up-desc">${up.desc}</div>`;
      btn.addEventListener('click', () => {
        this.onUpgradePick?.(up.id);
        this.upgradeModal.classList.remove('show');
      });
      this.upgradeList.appendChild(btn);
    }
    this.upgradeModal.classList.add('show');
  }

  // ============ 死亡面板 ============
  showDeathScreen() {
    const s = this.s;
    const t = s.getPlaySeconds();
    const mm = Math.floor(t / 60).toString().padStart(2, '0');
    const ss = Math.floor(t % 60).toString().padStart(2, '0');
    this.deathStats.innerHTML = `
      <div><span class="label">到达层数</span><span class="val">第 ${s.floor} 层</span></div>
      <div><span class="label">玩家等级</span><span class="val">LV ${s.player.lv}</span></div>
      <div><span class="label">击杀总数</span><span class="val">${s.totalKills}</span></div>
      <div><span class="label">累计金币</span><span class="val">🪙 ${s.totalGold}</span></div>
      <div><span class="label">游戏时长</span><span class="val">${mm}:${ss}</span></div>
    `;
    this.deathModal.classList.add('show');
  }

  hideDeathScreen() { this.deathModal.classList.remove('show'); }
}
