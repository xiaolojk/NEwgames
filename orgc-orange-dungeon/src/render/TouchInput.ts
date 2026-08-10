// 触屏输入控制器 · 橘子地牢
// 虚拟摇杆 + 动作按钮，移动设备自动启用
// Orgc 橘子工作室

export class TouchInput {
  private joystick!: HTMLElement;
  private knob!: HTMLElement;
  private btnAttack!: HTMLElement;
  private btnDash!: HTMLElement;
  private btnPotion!: HTMLElement;
  private btnShop!: HTMLElement;
  private rotateHint!: HTMLElement;
  private container!: HTMLElement;

  // 摇杆状态（-1 ~ 1）
  moveX = 0;
  moveY = 0;
  // 按钮状态
  attackPressed = false;
  dashPressed = false;
  // 攻击目标方向（基于摇杆方向，无摇杆时用 facing）
  attackDirX = 0;
  attackDirY = 0;

  private joyCenter = { x: 0, y: 0 };
  private joyRadius = 50;
  private activeTouchId: number | null = null;
  private enabled = false;

  constructor() {
    this.container = document.getElementById('touch-controls')!;
    this.joystick = document.getElementById('joystick')!;
    this.knob = document.getElementById('joystick-knob')!;
    this.btnAttack = document.getElementById('btn-attack')!;
    this.btnDash = document.getElementById('btn-dash')!;
    this.btnPotion = document.getElementById('btn-potion')!;
    this.btnShop = document.getElementById('btn-shop')!;
    this.rotateHint = document.getElementById('rotate-hint')!;
    this.detectAndSetup();
  }

  // 检测触屏设备并启用
  private detectAndSetup() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
    if (isTouch || isMobile) {
      this.enabled = true;
      this.container.classList.add('show');
      this.setupJoystick();
      this.setupButtons();
      this.setupOrientation();
      console.log('[Orgc] 触屏控制已启用');
    }
  }

  private setupJoystick() {
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      if (this.activeTouchId !== null) return;
      const t = e.changedTouches[0];
      this.activeTouchId = t.identifier;
      const rect = this.joystick.getBoundingClientRect();
      this.joyCenter.x = rect.left + rect.width / 2;
      this.joyCenter.y = rect.top + rect.height / 2;
      this.joyRadius = rect.width / 2;
      this.updateKnob(t.clientX, t.clientY);
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.activeTouchId) {
          this.updateKnob(t.clientX, t.clientY);
          break;
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.activeTouchId) {
          this.activeTouchId = null;
          this.moveX = 0;
          this.moveY = 0;
          this.knob.style.transform = 'translate(0, 0)';
          break;
        }
      }
    };
    this.joystick.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: false });
    window.addEventListener('touchcancel', onEnd, { passive: false });
  }

  private updateKnob(touchX: number, touchY: number) {
    let dx = touchX - this.joyCenter.x;
    let dy = touchY - this.joyCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.joyRadius) {
      dx = (dx / dist) * this.joyRadius;
      dy = (dy / dist) * this.joyRadius;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // 归一化到 -1 ~ 1，引入死区避免漂移
    const deadZone = 0.18;
    const nx = dx / this.joyRadius;
    const ny = dy / this.joyRadius;
    const mag = Math.sqrt(nx * nx + ny * ny);
    if (mag < deadZone) {
      this.moveX = 0;
      this.moveY = 0;
      // 死区内不清空 attackDir，保留最后一次有效方向
    } else {
      // 死区外重新归一化
      const adjusted = (mag - deadZone) / (1 - deadZone);
      this.moveX = (nx / mag) * adjusted;
      this.moveY = (ny / mag) * adjusted;
      // 记录攻击方向（保留最后一次有效方向，即使摇杆归零也用于攻击）
      this.attackDirX = nx / mag;
      this.attackDirY = ny / mag;
    }
  }

  // 设置默认攻击方向（用于未摇杆时按 facing 攻击）
  setAttackDir(x: number, y: number) {
    this.attackDirX = x;
    this.attackDirY = y;
  }

  private setupButtons() {
    // 攻击按钮：按下即触发一次攻击
    this.btnAttack.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.attackPressed = true;
    }, { passive: false });
    this.btnAttack.addEventListener('touchend', (e) => {
      e.preventDefault();
    }, { passive: false });

    // 冲刺按钮：按下持续触发
    this.btnDash.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.dashPressed = true;
    }, { passive: false });
    this.btnDash.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.dashPressed = false;
    }, { passive: false });

    // 药水按钮：快速使用第一个药水
    this.btnPotion.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // 通过自定义事件通知 GameScene
      window.dispatchEvent(new CustomEvent('orgc-quick-potion'));
    }, { passive: false });

    // 商店按钮：靠近商人时打开交易
    this.btnShop.addEventListener('touchstart', (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('orgc-open-shop'));
    }, { passive: false });
    this.btnShop.addEventListener('click', (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('orgc-open-shop'));
    });
  }

  private setupOrientation() {
    const check = () => {
      // 横屏：宽度 > 高度
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape) {
        this.rotateHint.classList.remove('show');
      } else {
        this.rotateHint.classList.add('show');
      }
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 200));
  }

  // 攻击触发后由 GameScene 调用清除
  consumeAttack(): boolean {
    if (this.attackPressed) {
      this.attackPressed = false;
      return true;
    }
    return false;
  }

  isDashHeld(): boolean {
    return this.dashPressed;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
