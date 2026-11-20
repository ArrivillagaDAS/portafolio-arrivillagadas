/**
 * Entrada unificada: teclado (WASD / flechas, Shift correr, Espacio saltar)
 * y, en pantallas táctiles, joystick virtual + botón de salto.
 */
export class Input {
  constructor(host) {
    this.keys = new Set();
    this.stick = { x: 0, y: 0, active: false };
    this.jumpQueued = false;
    this.enabled = false;

    addEventListener('keydown', (e) => {
      if (!this.enabled || e.target.closest?.('input, button, textarea')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && !e.repeat) this.jumpQueued = true;
      if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) this.actionQueued = true;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    this.touch = document.createElement('div');
    this.touch.className = 'touch';
    this.touch.hidden = true;
    this.touch.innerHTML = `
      <div class="stick" aria-hidden="true"><div class="knob"></div></div>
      <button type="button" class="jump" aria-label="Saltar">⤒</button>
      <button type="button" class="act" aria-label="Acción (cabezazo)"><svg class="paw" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><g fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="10" cy="6.5" r="2.2"/><circle cx="14" cy="6.5" r="2.2"/><circle cx="18" cy="10" r="2.2"/></g></svg></button>`;
    host.appendChild(this.touch);
    this.#bindTouch();
  }

  setEnabled(on) {
    this.enabled = on;
    this.keys.clear();
    this.stick.x = this.stick.y = 0;
    this.jumpQueued = this.actionQueued = false;
    const touchy = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.touch.hidden = !(on && touchy);
  }

  #bindTouch() {
    const base = this.touch.querySelector('.stick');
    const knob = this.touch.querySelector('.knob');
    let id = null, cx = 0, cy = 0;
    const R = 46;
    base.addEventListener('pointerdown', (e) => {
      id = e.pointerId; base.setPointerCapture(id);
      const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e);
    });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick.x = dx / R; this.stick.y = dy / R; this.stick.active = true;
    };
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null; knob.style.transform = '';
      this.stick.x = this.stick.y = 0; this.stick.active = false;
    };
    base.addEventListener('pointermove', move);
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
    this.touch.querySelector('.jump').addEventListener('pointerdown', (e) => { e.preventDefault(); this.jumpQueued = true; });
    this.touch.querySelector('.act').addEventListener('pointerdown', (e) => { e.preventDefault(); this.actionQueued = true; });
  }

  consumeAction() {
    const a = this.actionQueued;
    this.actionQueued = false;
    return a;
  }

  /** Dirección en pantalla: x derecha, y hacia adelante (arriba). Magnitud 0..1. */
  get move() {
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (this.stick.active) { x = this.stick.x; y = -this.stick.y; }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, mag: Math.min(1, m) };
  }

  get running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || (this.stick.active && Math.hypot(this.stick.x, this.stick.y) > 0.85);
  }

  consumeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }
}
