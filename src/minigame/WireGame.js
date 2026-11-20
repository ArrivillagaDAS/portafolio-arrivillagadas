import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// "No toques las paredes": el mismo gato (clonado, con su pelaje y accesorios)
// visto desde arriba, sigue al cursor por un laberinto de neón.
const LEVELS = [
  {
    name: 'Calentando motores',
    map: [
      '################',
      '#S.....#########',
      '#......#########',
      '####...#########',
      '####...........#',
      '####...........#',
      '############...#',
      '#G.........#...#',
      '#..............#',
      '################',
    ],
  },
  {
    name: 'Pasillos estrechos',
    map: [
      '################',
      '#S#....#.......#',
      '#.#.##.#.#####.#',
      '#.#.#..#.#...#.#',
      '#...#.##.#.#.#.#',
      '#####.#..#.#...#',
      '#.....#.##.#####',
      '#.#####......G.#',
      '#..............#',
      '################',
    ],
  },
  {
    name: 'La serpiente final',
    map: [
      '################',
      '#S.............#',
      '##############.#',
      '#..............#',
      '#.##############',
      '#..............#',
      '##############.#',
      '#G.............#',
      '################',
    ],
  },
];
const RADIUS = 0.2;     // radio del gato (en celdas)
const MAX_SPEED = 5.5;  // celdas/s: así no se puede "teletransportar" a través de paredes

export class WireGame {
  /**
   * @param {import('../cat/GamerCat.js').GamerCat} cat
   * @param {{ onExit: () => void }} hooks
   */
  constructor(cat, { onExit }) {
    this.cat = cat;
    this.onExit = onExit;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07040f);
    this.camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 50);
    this.camera.position.set(0, 20, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x443366, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 10, 4); this.scene.add(key);
    this.level = null;
    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);
    this.pointer = new THREE.Vector3();
    this.hasPointer = false;
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.active = false;
    this.#buildUi();
    this.onMove = (e) => this.#handleMove(e);
  }

  // ------------------------------------------------------------ ciclo de vida
  open() {
    this.active = true;
    this.ui.hidden = false;
    if (!this.mini) this.#makeMiniCat();
    this.attempts = 0;
    this.totalTime = 0;
    this.#loadLevel(0);
    addEventListener('pointermove', this.onMove);
    addEventListener('pointerdown', this.onMove);
    this.resize();
  }

  close() {
    this.active = false;
    this.ui.hidden = true;
    removeEventListener('pointermove', this.onMove);
    removeEventListener('pointerdown', this.onMove);
    this.onExit?.();
  }

  resize() {
    if (!this.level) return;
    // encajar el nivel en la "pantalla" del arcade (dejando espacio al marco)
    const { cols, rows } = this.level;
    const frame = this.ui.querySelector('.cab-screen').getBoundingClientRect();
    const aspect = frame.width / Math.max(1, frame.height);
    let w = cols + 1, h = rows + 1;
    if (w / h > aspect) h = w / aspect; else w = h * aspect;
    // desplazar la cámara para que el área visible coincida con el hueco del marco
    const vw = innerWidth, vh = innerHeight;
    const sx = vw / frame.width, sy = vh / frame.height;
    const fullW = w * sx, fullH = h * sy;
    const cxPx = frame.left + frame.width / 2 - vw / 2, cyPx = frame.top + frame.height / 2 - vh / 2;
    const offX = -(cxPx / vw) * fullW, offZ = -(cyPx / vh) * fullH;
    Object.assign(this.camera, { left: -fullW / 2 + offX, right: fullW / 2 + offX, top: fullH / 2 - offZ, bottom: -fullH / 2 - offZ });
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ gato miniatura
  #makeMiniCat() {
    this.mini = cloneSkinned(this.cat.model);
    this.mini.scale.multiplyScalar(0.95); // ~0.8 celdas de largo: se reconoce bien desde arriba
    this.mini.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.miniRoot = new THREE.Group();
    this.miniRoot.add(this.mini);
    this.scene.add(this.miniRoot);
    this.mixer = new THREE.AnimationMixer(this.mini);
    this.actions = new Map(this.cat.clips.map((c) => [c.name.split('|').pop(), this.mixer.clipAction(c)]));
    const death = this.actions.get('Death'); death.setLoop(THREE.LoopOnce, 1); death.clampWhenFinished = true;
    this.#play('Idle');
  }

  #play(name, fade = 0.12) {
    const next = this.actions.get(name);
    if (!next || next === this.current) return;
    next.reset().play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
  }

  // ------------------------------------------------------------ niveles
  #loadLevel(i) {
    this.levelIndex = i;
    const def = LEVELS[i];
    const rows = def.map.length, cols = def.map[0].length;
    const grid = def.map.map((r) => r.split(''));
    this.level = { rows, cols, grid };
    this.levelGroup.clear();
    const ox = -cols / 2 + 0.5, oz = -rows / 2 + 0.5;
    this.toWorld = (c, r) => new THREE.Vector3(ox + c, 0, oz + r);
    this.toCell = (p) => [Math.round(p.x - ox), Math.round(p.z - oz)];
    // suelo con rejilla
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(cols, rows), new THREE.MeshBasicMaterial({ color: 0x120a24 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; this.levelGroup.add(floor);
    const grid3 = new THREE.GridHelper(Math.max(cols, rows), Math.max(cols, rows), 0x2a1850, 0x1c1238);
    grid3.position.set(cols % 2 ? 0.5 : 0, 0, rows % 2 ? 0.5 : 0); this.levelGroup.add(grid3);
    // paredes de neón: bloque + borde brillante
    const hue = [0.85, 0.52, 0.12][i % 3];
    const wallMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.9, 0.18) });
    const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color().setHSL(hue, 1, 0.62) });
    this.edgeMat = edgeMat; this.wallMat = wallMat; this.baseHue = hue;
    const boxGeo = new THREE.BoxGeometry(1, 0.4, 1), edges = new THREE.EdgesGeometry(boxGeo);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ch = grid[r][c], p = this.toWorld(c, r);
      if (ch === '#') {
        const m = new THREE.Mesh(boxGeo, wallMat); m.position.set(p.x, 0.2, p.z); this.levelGroup.add(m);
        const e = new THREE.LineSegments(edges, edgeMat); e.position.copy(m.position); this.levelGroup.add(e);
      } else if (ch === 'S') {
        this.start = p.clone();
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x2ee6a0, transparent: true, opacity: 0.35 }));
        pad.rotation.x = -Math.PI / 2; pad.position.set(p.x, 0.005, p.z); this.levelGroup.add(pad);
      } else if (ch === 'G') {
        this.goal = p.clone();
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.45 }));
        pad.rotation.x = -Math.PI / 2; pad.position.set(p.x, 0.005, p.z); this.levelGroup.add(pad);
        this.goalPad = pad;
        const fish = new THREE.Group();
        const gold = new THREE.MeshBasicMaterial({ color: 0xffd23f });
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), gold); b.scale.set(1.6, 0.6, 1); fish.add(b);
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 4), gold); t.rotation.z = Math.PI / 2; t.position.x = -0.3; fish.add(t);
        fish.position.set(p.x, 0.3, p.z); this.levelGroup.add(fish); this.goalFish = fish;
      }
    }
    this.state = 'ready'; // ready → playing → (dead | won)
    this.levelTime = 0;
    this.miniRoot.position.copy(this.start);
    this.miniRoot.rotation.y = Math.PI / 2;
    this.#play('Idle');
    this.#hud();
    this.#message(`Nivel ${i + 1}: ${def.name}`, 'Pon el cursor sobre el gato para empezar');
    this.resize();
  }

  #hitsWall(p) {
    const { grid, rows, cols } = this.level;
    const [c0, r0] = this.toCell(p);
    for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return true;
      if (grid[r][c] !== '#') continue;
      const w = this.toWorld(c, r);
      const dx = Math.max(Math.abs(p.x - w.x) - 0.5, 0), dz = Math.max(Math.abs(p.z - w.z) - 0.5, 0);
      if (dx * dx + dz * dz < RADIUS * RADIUS) return true;
    }
    return false;
  }

  #handleMove(e) {
    if (!this.active || e.target.closest?.('button')) return;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    this.ray.ray.intersectPlane(this.plane, this.pointer);
    this.hasPointer = true;
  }

  // ------------------------------------------------------------ bucle
  update(dt, t) {
    if (!this.active) return;
    this.mixer.update(dt);
    if (this.goalFish) { this.goalFish.rotation.y += dt * 2; this.goalFish.position.y = 0.3 + Math.sin(t * 4) * 0.05; }
    if (this.goalPad) this.goalPad.material.opacity = 0.35 + Math.sin(t * 5) * 0.15;
    this.edgeMat.color.setHSL(this.baseHue, 1, this.state === 'dead' ? 0.5 + Math.sin(t * 40) * 0.3 : 0.6 + Math.sin(t * 3) * 0.08);

    const cat = this.miniRoot.position;
    if (this.state === 'ready') {
      if (this.hasPointer && this.pointer.distanceTo(cat) < 0.55) { this.state = 'playing'; this.#message(null); }
      return;
    }
    if (this.state !== 'playing') return;
    this.levelTime += dt;
    this.#hud();
    // seguir al cursor con velocidad máxima, en subpasos (no atraviesa paredes)
    const to = this.pointer.clone().sub(cat).setY(0);
    const dist = to.length();
    const move = Math.min(dist, MAX_SPEED * dt);
    if (dist > 0.02) {
      const dir = to.normalize();
      const steps = Math.ceil(move / 0.05);
      for (let i = 0; i < steps; i++) {
        cat.addScaledVector(dir, move / steps);
        if (this.#hitsWall(cat)) { this.#die(); return; }
      }
      const target = Math.atan2(dir.x, dir.z);
      let d = target - this.miniRoot.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.miniRoot.rotation.y += d * Math.min(1, dt * 14);
    }
    const speed = move / Math.max(dt, 1e-4);
    this.#play(speed > 2.4 ? 'Run' : speed > 0.25 ? 'Walk' : 'Idle');
    if (cat.distanceTo(this.goal) < 0.45) this.#win();
  }

  #die() {
    this.state = 'dead';
    this.attempts++;
    this.#play('Death', 0.05);
    this.ui.querySelector('.cab-screen').classList.add('shake');
    this.#message('¡Tocaste la pared!', 'Volviendo al inicio…', 'bad');
    this.#hud();
    setTimeout(() => {
      this.ui.querySelector('.cab-screen').classList.remove('shake');
      if (!this.active) return;
      this.state = 'ready';
      this.hasPointer = false;
      this.miniRoot.position.copy(this.start);
      this.#play('Idle');
      this.#message('Otra vez', 'Pon el cursor sobre el gato para empezar');
    }, 1300);
  }

  #win() {
    this.state = 'won';
    this.totalTime += this.levelTime;
    this.#play('Idle');
    const last = this.levelIndex === LEVELS.length - 1;
    if (last) {
      this.#message('¡GANASTE!', `3 niveles en ${this.totalTime.toFixed(1)} s · ${this.attempts} choques`, 'good', true);
    } else {
      this.#message('¡Nivel superado!', `${this.levelTime.toFixed(1)} s`, 'good');
      setTimeout(() => this.active && this.#loadLevel(this.levelIndex + 1), 1400);
    }
  }

  // ------------------------------------------------------------ interfaz
  #buildUi() {
    const el = document.createElement('div');
    el.className = 'cabinet';
    el.hidden = true;
    el.innerHTML = `
      <div class="cab-top"><span class="cab-logo">CAT-CADE</span><span class="cab-sub">NO TOQUES LAS PAREDES</span></div>
      <div class="cab-screen">
        <div class="cab-hud"><span data-level></span><span data-time></span><span data-tries></span></div>
        <div class="cab-msg" hidden><b></b><small></small><button type="button" class="primary" data-again hidden>Jugar otra vez</button></div>
        <div class="scan" aria-hidden="true"></div>
      </div>
      <div class="cab-bottom"><button type="button" class="ghost" data-exit>Salir del arcade (Esc)</button></div>`;
    document.body.appendChild(el);
    this.ui = el;
    el.querySelector('[data-exit]').addEventListener('click', () => this.close());
    el.querySelector('[data-again]').addEventListener('click', () => { this.attempts = 0; this.totalTime = 0; this.#loadLevel(0); });
    addEventListener('keydown', (e) => { if (this.active && e.code === 'Escape') { e.stopImmediatePropagation(); this.close(); } }, true);
  }

  #hud() {
    this.ui.querySelector('[data-level]').textContent = `NIVEL ${this.levelIndex + 1}/${LEVELS.length}`;
    this.ui.querySelector('[data-time]').textContent = `TIEMPO ${this.levelTime.toFixed(1)} s`;
    this.ui.querySelector('[data-tries]').textContent = `CHOQUES ${this.attempts ?? 0}`;
  }

  #message(title, sub = '', kind = '', again = false) {
    const box = this.ui.querySelector('.cab-msg');
    box.hidden = !title;
    if (!title) return;
    box.className = `cab-msg ${kind}`;
    box.querySelector('b').textContent = title;
    box.querySelector('small').textContent = sub;
    box.querySelector('[data-again]').hidden = !again;
  }


}
