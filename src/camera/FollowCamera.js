import * as THREE from 'three';

/**
 * Cámara orbital que sigue al gato.
 * - Arrastrar con el mouse (clic izquierdo) o con un dedo gira la vista.
 * - Rueda / pellizco acerca y aleja.
 * - `bounds` (Box3) mantiene la cámara dentro de la habitación para que las paredes no tapen.
 */
export class FollowCamera {
  constructor(camera, canvas) {
    this.camera = camera;
    this.yaw = Math.PI / 4;
    this.pitch = 0.72;
    this.distance = 3.0;
    this.minD = 1.4; this.maxD = 5.0;
    this.minPitch = 0.42; this.maxPitch = 1.35; // nunca a ras de suelo: marea y no deja ver el diseño
    this.focus = new THREE.Vector3();
    this.bounds = null;
    this.occluders = [];
    this.ray = new THREE.Raycaster();
    this.enabled = false;
    this.velYaw = 0; this.velPitch = 0;
    this.sensitivity = 1; // multiplicador (1 = suave)
    this.lastInputAt = 0;

    const drag = new Map(); // pointerId -> {x, y}
    let pinch = null;

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('grabbing');
      if (drag.size === 2) {
        const [a, b] = [...drag.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), start: this.distance };
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = drag.get(e.pointerId);
      if (!this.enabled || !p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (drag.size === 2 && pinch) {
        const [a, b] = [...drag.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.distance = THREE.MathUtils.clamp(pinch.start * (pinch.d / d), this.minD, this.maxD);
        return;
      }
      const s = (e.pointerType === 'touch' ? 0.0045 : 0.0024) * this.sensitivity;
      this.velYaw = -dx * s;
      this.velPitch = dy * s;
      this.yaw += this.velYaw;
      this.pitch = THREE.MathUtils.clamp(this.pitch + this.velPitch, this.minPitch, this.maxPitch);
      this.lastInputAt = performance.now();
    });
    const end = (e) => {
      drag.delete(e.pointerId);
      if (drag.size < 2) pinch = null;
      if (!drag.size) canvas.classList.remove('grabbing');
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.distance = THREE.MathUtils.clamp(this.distance * (1 + Math.sign(e.deltaY) * 0.08), this.minD, this.maxD);
    }, { passive: false });
    this.isDragging = () => drag.size > 0;
  }

  snap(target) {
    this.focus.copy(target);
    this.update(1, target, true);
  }

  update(dt, target, instant = false) {
    // inercia suave al soltar
    if (!this.isDragging() && !instant) {
      const damp = Math.exp(-dt * 10); // inercia corta: no marea
      this.velYaw *= damp; this.velPitch *= damp;
      this.yaw += this.velYaw;
      this.pitch = THREE.MathUtils.clamp(this.pitch + this.velPitch, this.minPitch, this.maxPitch);
    }
    const k = instant ? 1 : 1 - Math.exp(-dt * 6);
    this.focus.lerp(target, k);
    const look = this.focus.clone().add(new THREE.Vector3(0, 0.18, 0));
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    let d = this.distance;
    // acortar la distancia si la cámara saldría de la habitación
    if (this.bounds) {
      const b = this.bounds;
      for (const axis of ['x', 'y', 'z']) {
        const v = dir[axis];
        if (v > 1e-4) d = Math.min(d, (b.max[axis] - look[axis]) / v);
        else if (v < -1e-4) d = Math.min(d, (b.min[axis] - look[axis]) / v);
      }
      d = Math.max(d, 0.35);
    }
    // brazo de cámara: si un mueble tapa al gato, la cámara se acerca
    if (this.occluders.length) {
      this.ray.set(look, dir);
      this.ray.far = d;
      const hit = this.ray.intersectObjects(this.occluders, true)[0];
      if (hit) d = Math.max(0.3, hit.distance - 0.1);
    }
    const pos = look.clone().addScaledVector(dir, d);
    if (instant) this.camera.position.copy(pos);
    else this.camera.position.lerp(pos, 1 - Math.exp(-dt * 12));
    this.camera.lookAt(look);
  }
}
