// Objetos procedurales (sin modelos descargados): todo con primitivas y canvas.
// Cada constructor devuelve { object, colliders: Box3[], update?(t, dt, ctx) }.
import * as THREE from 'three';

const box3 = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { cv, g };
  return tex;
}

// ---------------------------------------------------------------- rascador
/** Torre rascador de 3 pisos con cama arriba. Plataformas alternadas para escalar. */
export function catTower({ x, z }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const carpet = new THREE.MeshStandardMaterial({ color: 0x8e7bd6, roughness: 1 });
  const carpet2 = new THREE.MeshStandardMaterial({ color: 0x5f4fa8, roughness: 1 });
  const rope = new THREE.MeshStandardMaterial({ color: 0xd9b98a, roughness: 1 });
  const colliders = [];
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), carpet2);
  base.position.y = 0.03; g.add(base);
  colliders.push(box3(x - 0.3, 0, z - 0.3, x + 0.3, 0.06, z + 0.3));
  // [desplX, desplZ, altura, radio]
  const levels = [[0.12, 0.1, 0.45, 0.2], [-0.12, -0.08, 0.9, 0.19], [0.1, -0.12, 1.35, 0.2]];
  let prev = { x: 0, z: 0, y: 0.06 };
  for (const [dx, dz, y, r] of levels) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, y - prev.y, 12), rope);
    post.position.set(prev.x * 0.5 + dx * 0.5, (y + prev.y) / 2, prev.z * 0.5 + dz * 0.5);
    post.castShadow = true; g.add(post);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 24), carpet);
    plat.position.set(dx, y, dz); plat.castShadow = true; plat.receiveShadow = true; g.add(plat);
    colliders.push(box3(x + dx - r * 0.8, y - 0.025, z + dz - r * 0.8, x + dx + r * 0.8, y + 0.025, z + dz + r * 0.8));
    prev = { x: dx, z: dz, y };
  }
  // cama tipo dona en la cima
  const bed = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 10, 24), carpet2);
  bed.rotation.x = Math.PI / 2; bed.position.set(prev.x, prev.y + 0.05, prev.z); g.add(bed);
  // juguete colgante
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22), rope);
  string.position.set(levels[0][0] + 0.15, levels[0][2] - 0.12, levels[0][1]); g.add(string);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0x551040 }));
  pom.position.set(string.position.x, string.position.y - 0.13, string.position.z); g.add(pom);
  return {
    object: g, colliders,
    update(t) { pom.position.x = string.position.x + Math.sin(t * 2.2) * 0.02; },
  };
}

// ---------------------------------------------------------------- arcade
/** Máquina arcade con pantalla animada (mini "snake" en modo demo). */
export function arcade({ x, z, rotY = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = rotY;
  const body = new THREE.MeshStandardMaterial({ color: 0x1d1440, roughness: 0.6 });
  const side = new THREE.MeshStandardMaterial({ color: 0x3a1f7a, roughness: 0.5 });
  const W = 0.62, D = 0.6, Hh = 1.62;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, Hh, D), body); cab.position.y = Hh / 2; cab.castShadow = true; g.add(cab);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, Hh + 0.04, D + 0.04), side);
    p.position.set(s * (W / 2 - 0.015), Hh / 2, 0); g.add(p);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.012, Hh, 0.012), new THREE.MeshBasicMaterial({ color: 0x38e1ff }));
    strip.position.set(s * (W / 2 + 0.002), Hh / 2, D / 2 + 0.02); g.add(strip);
  }
  // pantalla animada
  const scr = canvasTex(160, 128, () => {});
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.37), new THREE.MeshBasicMaterial({ map: scr }));
  screen.position.set(0, 1.18, D / 2 + 0.002); screen.rotation.x = -0.12; g.add(screen);
  // marquesina
  const mq = canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = '#12082a'; c.fillRect(0, 0, w, h);
    c.font = 'bold 40px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff4fd8'; c.shadowBlur = 18; c.fillStyle = '#ffe3fa'; c.fillText('CAT-CADE', w / 2, h / 2 + 2);
  });
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.14), new THREE.MeshBasicMaterial({ map: mq }));
  marquee.position.set(0, 1.5, D / 2 + 0.003); g.add(marquee);
  // panel de control
  const panel = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.06, 0.2), side);
  panel.position.set(0, 0.92, D / 2 + 0.08); panel.rotation.x = 0.25; g.add(panel);
  const stick = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff3355 }));
  stick.position.set(-0.13, 0.99, D / 2 + 0.1); g.add(stick);
  const btnColors = [0x38e1ff, 0xffd23f, 0x5fd38d];
  btnColors.forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 12), new THREE.MeshBasicMaterial({ color: c }));
    b.position.set(0.04 + i * 0.06, 0.97, D / 2 + 0.08); b.rotation.x = 0.25; g.add(b);
  });

  // mini snake en el canvas
  const { g: c } = scr.userData;
  const N = 16, cell = 10;
  let snake = [[8, 6], [7, 6], [6, 6]], dirV = [1, 0], food = [12, 9], acc = 0, score = 0, mode = 'demo', flash = 0;
  const step = () => {
    // IA sencilla: girar hacia la comida evitando chocar
    const [hx, hy] = snake[0];
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !(dx === -dirV[0] && dy === -dirV[1]));
    const safe = opts.filter(([dx, dy]) => {
      const nx = (hx + dx + N) % N, ny = (hy + dy + 12) % 12;
      return !snake.some(([sx, sy]) => sx === nx && sy === ny);
    });
    const pick = (safe.length ? safe : opts).sort((a, b) =>
      (Math.abs(hx + a[0] - food[0]) + Math.abs(hy + a[1] - food[1])) - (Math.abs(hx + b[0] - food[0]) + Math.abs(hy + b[1] - food[1])))[0];
    dirV = pick;
    const nh = [(hx + dirV[0] + N) % N, (hy + dirV[1] + 12) % 12];
    if (snake.some(([sx, sy]) => sx === nh[0] && sy === nh[1])) { snake = [[8, 6], [7, 6], [6, 6]]; score = 0; return; }
    snake.unshift(nh);
    if (nh[0] === food[0] && nh[1] === food[1]) { score++; food = [Math.floor(Math.random() * N), Math.floor(Math.random() * 12)]; }
    else snake.pop();
    if (snake.length > 40) snake.length = 40;
  };
  const draw = (t) => {
    c.fillStyle = '#05030c'; c.fillRect(0, 0, 160, 128);
    c.fillStyle = flash > 0 ? '#ff4fd8' : '#1a1036'; c.fillRect(0, 0, 160, 8);
    c.fillStyle = '#fff'; c.font = 'bold 7px monospace';
    c.fillText(mode === 'demo' ? `DEMO  ·  HI ${String(Math.max(score, 42)).padStart(3, '0')}` : `¡MIAU! +1  ·  ${score}`, 4, 7);
    c.fillStyle = '#ffd23f'; c.fillRect(food[0] * cell, 8 + food[1] * cell, cell - 1, cell - 1);
    snake.forEach(([sx, sy], i) => {
      c.fillStyle = `hsl(${(t * 60 + i * 12) % 360} 100% 60%)`;
      c.fillRect(sx * cell, 8 + sy * cell, cell - 1, cell - 1);
    });
    scr.needsUpdate = true;
  };
  return {
    object: g,
    colliders: [new THREE.Box3().setFromObject(cab).expandByScalar(0.02)],
    interact() { mode = 'play'; flash = 1.2; score += 1; for (let i = 0; i < 3; i++) step(); },
    update(t, dt) {
      acc += dt; flash = Math.max(0, flash - dt);
      if (flash === 0) mode = 'demo';
      if (acc > 0.11) { acc = 0; step(); draw(t); }
    },
  };
}

// ---------------------------------------------------------------- pecera
/** Pecera con peces nadando; se alborotan si el gato se acerca. */
export function fishTank({ x, z, y, rotY = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rotY;
  const W = 0.7, Hh = 0.42, D = 0.34;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), new THREE.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }));
  glass.position.y = Hh / 2; g.add(glass);
  const water = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, Hh - 0.06, D - 0.02), new THREE.MeshBasicMaterial({ color: 0x1b6fd1, transparent: true, opacity: 0.35, depthWrite: false }));
  water.position.y = (Hh - 0.06) / 2 + 0.01; g.add(water);
  const sand = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.04, D - 0.02), new THREE.MeshStandardMaterial({ color: 0xe3c58e }));
  sand.position.y = 0.02; g.add(sand);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.03, D + 0.02), new THREE.MeshStandardMaterial({ color: 0x15121f }));
  lid.position.y = Hh + 0.015; g.add(lid);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.01, 0.04), new THREE.MeshBasicMaterial({ color: 0x9fe7ff }));
  lamp.position.y = Hh - 0.005; g.add(lamp);
  // plantas y burbujas
  const weed = new THREE.MeshStandardMaterial({ color: 0x2fd38a, emissive: 0x0b4028 });
  for (let i = 0; i < 6; i++) {
    const h = 0.12 + Math.random() * 0.15;
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.02, h, 5), weed);
    w.position.set(-W / 2 + 0.06 + i * 0.11, 0.04 + h / 2, (Math.random() - 0.5) * (D - 0.1)); g.add(w);
  }
  const bubbles = [];
  const bMat = new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), bMat);
    b.position.set(W / 2 - 0.08, Math.random() * Hh, 0); g.add(b); bubbles.push(b);
  }
  // peces: cuerpo + cola
  const fish = [];
  const colors = [0xff8a3d, 0xffd23f, 0xff4fd8, 0x38e1ff, 0xffffff];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.25 });
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), m); bodyM.scale.set(1.5, 1, 0.6); f.add(bodyM);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.04, 4), m); tail.rotation.z = Math.PI / 2; tail.position.x = -0.055; f.add(tail);
    g.add(f);
    fish.push({ f, tail, r: 0.12 + Math.random() * 0.12, h: 0.1 + Math.random() * 0.25, s: 0.5 + Math.random() * 0.6, ph: Math.random() * 6.28, dir: i % 2 ? 1 : -1 });
  }
  let panic = 0;
  const world = new THREE.Vector3();
  return {
    object: g,
    colliders: [],
    update(t, dt, ctx) {
      g.getWorldPosition(world);
      const near = ctx?.catPos && ctx.catPos.distanceTo(world) < 0.7;
      panic += ((near ? 1 : 0) - panic) * Math.min(1, dt * 3);
      for (const o of fish) {
        o.ph += dt * o.s * (1 + panic * 2.5) * o.dir;
        const px = Math.cos(o.ph) * o.r * (W / 0.6) * 0.9, pz = Math.sin(o.ph) * o.r * 0.55;
        o.f.position.set(THREE.MathUtils.clamp(px, -W / 2 + 0.06, W / 2 - 0.06), o.h + Math.sin(t * 2 + o.ph) * 0.02, THREE.MathUtils.clamp(pz, -D / 2 + 0.04, D / 2 - 0.04));
        o.f.rotation.y = -o.ph * 1 - (o.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        o.tail.rotation.y = Math.sin(t * (10 + panic * 15)) * 0.5;
      }
      for (const b of bubbles) { b.position.y += dt * 0.12; if (b.position.y > Hh - 0.04) b.position.set(W / 2 - 0.08 + (Math.random() - 0.5) * 0.02, 0.05, (Math.random() - 0.5) * 0.06); }
    },
  };
}

// ---------------------------------------------------------------- arenero
/** Arenero: bandeja con arena. Al entrar el gato puede "cavar" y abrir el túnel. */
export function litterBox({ x, z, rotY = 0, glow = true }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = rotY;
  const W = 0.7, D = 0.52, Hh = 0.13, T = 0.03;
  const plastic = new THREE.MeshStandardMaterial({ color: 0x38e1ff, roughness: 0.4 });
  const sandTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#e8cf98'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { c.fillStyle = `hsl(40 ${40 + Math.random() * 30}% ${55 + Math.random() * 25}%)`; c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  });
  const sand = new THREE.Mesh(new THREE.BoxGeometry(W - T * 2, 0.07, D - T * 2), new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }));
  sand.position.y = 0.035; sand.receiveShadow = true; g.add(sand);
  const walls = [];
  for (const [w, d, px, pz] of [[W, T, 0, -D / 2 + T / 2], [W, T, 0, D / 2 - T / 2], [T, D, -W / 2 + T / 2, 0], [T, D, W / 2 - T / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, Hh, d), plastic);
    m.position.set(px, Hh / 2, pz); m.castShadow = true; g.add(m); walls.push(m);
  }
  // agujero misterioso con brillo
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), new THREE.MeshBasicMaterial({ color: 0x0a0612 }));
  hole.rotation.x = -Math.PI / 2; hole.position.set(0.12, 0.072, 0.05); g.add(hole);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.115, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8 }));
  ring.rotation.x = -Math.PI / 2; ring.position.copy(hole.position); ring.position.y += 0.001; g.add(ring);
  // letrero
  const sign = canvasTex(256, 96, (c, w, h) => {
    c.fillStyle = '#1a1230'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffd23f'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#ffd23f'; c.font = 'bold 34px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(glow ? 'ARENERO' : 'SALIDA', w / 2, h / 2 + 2);
  });
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: sign }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35), new THREE.MeshStandardMaterial({ color: 0x444 }));
  pole.position.set(-W / 2 + 0.06, 0.25, -D / 2 + 0.06); g.add(pole);
  signM.position.set(-W / 2 + 0.06, 0.4, -D / 2 + 0.07); g.add(signM);

  g.updateMatrixWorld(true);
  const colliders = walls.map((w) => new THREE.Box3().setFromObject(w));
  const inner = new THREE.Box3().setFromObject(sand).expandByVector(new THREE.Vector3(-0.04, 0.3, -0.04));
  return {
    object: g, colliders, inner,
    update(t) { ring.material.opacity = 0.45 + Math.sin(t * 4) * 0.35; ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08); },
  };
}

// ---------------------------------------------------------------- láser
/** Punto láser que deambula por el suelo. Si el gato lo atrapa, salta a otro sitio. */
export function laserPointer({ area }) {
  const g = new THREE.Group();
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), new THREE.MeshBasicMaterial({ color: 0xff1a3c }));
  dot.rotation.x = -Math.PI / 2; g.add(dot);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ color: 0xff1a3c, transparent: true, opacity: 0.25, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; g.add(halo);
  g.position.y = 0.004;
  const target = new THREE.Vector3(), pos = new THREE.Vector3(0.5, 0.004, 0.5);
  const pick = () => target.set(THREE.MathUtils.randFloat(area.min.x, area.max.x), 0.004, THREE.MathUtils.randFloat(area.min.z, area.max.z));
  pick();
  let wait = 0, caught = 0;
  return {
    object: g, colliders: [],
    get caught() { return caught; },
    update(t, dt, ctx) {
      // movimiento nervioso: tramos rápidos y pausas
      if (wait > 0) wait -= dt;
      else {
        const d = target.clone().sub(pos);
        const L = d.length();
        if (L < 0.05) { wait = Math.random() * 0.8; pick(); }
        else pos.addScaledVector(d.normalize(), Math.min(L, dt * (1.2 + Math.sin(t * 7) * 0.6)));
      }
      g.position.set(pos.x + Math.sin(t * 37) * 0.004, 0.004, pos.z + Math.cos(t * 41) * 0.004);
      halo.scale.setScalar(1 + Math.sin(t * 20) * 0.15);
      if (ctx?.catPos && ctx.catGrounded && ctx.catPos.y < 0.2 && Math.hypot(ctx.catPos.x - pos.x, ctx.catPos.z - pos.z) < 0.16) {
        caught++; ctx.onCatch?.(caught);
        pos.copy(pick()); wait = 0.4;
      }
    },
  };
}

// ---------------------------------------------------------------- estambre
export function yarnBall(color, r = 0.07) {
  const tex = canvasTex(128, 64, (c, w, h) => {
    const base = new THREE.Color(color);
    c.fillStyle = `#${base.getHexString()}`; c.fillRect(0, 0, w, h);
    c.strokeStyle = `#${base.clone().multiplyScalar(0.65).getHexString()}`; c.lineWidth = 2.5;
    for (let i = -h; i < w + h; i += 7) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h * 0.8, h); c.stroke(); }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------- ventana
/** Vista nocturna de ciudad para poner detrás de la ventana. */
export function citySkyline(width, height) {
  const tex = canvasTex(1024, 512, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b0a2a'); sky.addColorStop(0.6, '#3a1a5e'); sky.addColorStop(1, '#ff5fa2');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; c.fillRect(Math.random() * w, Math.random() * h * 0.5, 2, 2); }
    c.fillStyle = '#ffe9c9'; c.beginPath(); c.arc(w * 0.78, h * 0.22, 38, 0, Math.PI * 2); c.fill();
    for (let layer = 0; layer < 2; layer++) {
      let x = -20;
      while (x < w) {
        const bw = 40 + Math.random() * 70, bh = h * (0.25 + Math.random() * (layer ? 0.45 : 0.3));
        c.fillStyle = layer ? '#120a26' : '#26164a';
        c.fillRect(x, h - bh, bw, bh);
        for (let wy = h - bh + 10; wy < h - 8; wy += 14) for (let wx = x + 6; wx < x + bw - 6; wx += 11) {
          if (Math.random() < 0.35) { c.fillStyle = ['#ffd23f', '#38e1ff', '#ff4fd8', '#fff3c4'][Math.floor(Math.random() * 4)]; c.fillRect(wx, wy, 5, 7); }
        }
        x += bw + 4;
      }
    }
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex }));
}

// ---------------------------------------------------------------- rockola
/** Rockola retro: arco con tubos de neón que laten con la música. */
export function jukebox({ x, z, rotY = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = rotY;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a3b2e, roughness: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9d4e8, metalness: 0.9, roughness: 0.25 });
  const W = 0.62, D = 0.42, Hb = 0.85;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, Hb, D), wood); body.position.y = Hb / 2; body.castShadow = true; g.add(body);
  // arco superior (media cápsula)
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, D, 32, 1, false, -Math.PI / 2, Math.PI), wood);
  arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2; arch.position.y = Hb; arch.castShadow = true; g.add(arch);
  // tubos de neón en el arco
  const neonMats = [0xff4fd8, 0xffd23f, 0x38e1ff].map((c) => new THREE.MeshBasicMaterial({ color: c }));
  [0.29, 0.24, 0.19].forEach((r, i) => {
    const tube = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 40, Math.PI), neonMats[i]);
    tube.position.set(0, Hb, D / 2 + 0.008); g.add(tube);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.024, Hb - 0.2, 0.024), neonMats[i]);
      side.position.set(s * r, Hb / 2 + 0.1, D / 2 + 0.008); g.add(side);
    }
  });
  // ventana con discos
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1840 }));
  glass.position.set(0, Hb - 0.02, D / 2 + 0.006); g.add(glass);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 32), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.35 }));
  disc.rotation.x = Math.PI / 2; disc.position.set(0, Hb + 0.02, D / 2 - 0.05); g.add(disc);
  // panel de selección y rejilla del parlante
  const panel = new THREE.Mesh(new THREE.BoxGeometry(W - 0.18, 0.12, 0.02), chrome); panel.position.set(0, 0.62, D / 2 + 0.01); g.add(panel);
  const grill = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshStandardMaterial({ color: 0x2a1c18, roughness: 1 }));
  grill.position.set(0, 0.3, D / 2 + 0.006); g.add(grill);
  const bars = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.1, 0.01), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    b.position.set(-0.1 + i * 0.033, 0.3, D / 2 + 0.012); g.add(b); bars.push(b);
  }
  const light = new THREE.PointLight(0xff7ad8, 1.2, 2.2, 1.8); light.position.set(0, 0.9, D / 2 + 0.3); g.add(light);
  g.updateMatrixWorld(true);
  return {
    object: g,
    colliders: [new THREE.Box3().setFromObject(body), new THREE.Box3().setFromObject(arch)],
    /** @param {number[]} levels 0..1 por banda (vacío = en silencio) */
    update(t, dt, ctx) {
      const lv = ctx?.musicLevels;
      const playing = lv && lv.length;
      disc.rotation.y += dt * (playing ? 4 : 0);
      bars.forEach((b, i) => {
        const v = playing ? lv[i % lv.length] : 0.05;
        b.scale.y = 0.2 + v * 2.2; b.position.y = 0.3 + (b.scale.y - 1) * 0.05 * 0;
      });
      neonMats.forEach((m, i) => m.color.setHSL(((playing ? t * 0.2 : 0) + i * 0.15 + 0.85) % 1, 1, playing ? 0.55 + (lv[i] ?? 0) * 0.25 : 0.4));
      light.intensity = playing ? 1 + (lv[0] ?? 0) * 2.5 : 0.5;
      light.color.copy(neonMats[0].color);
    },
  };
}

// ---------------------------------------------------------------- guirnalda
/** Guirnalda de foquitos cálidos colgando en curva entre dos puntos. */
export function stringLights(a, b, { count = 18, sag = 0.18, color = 0xffc46b } = {}) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.004, 4), new THREE.MeshBasicMaterial({ color: 0x2a2232 })));
  const bulbGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const bulbs = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.MeshBasicMaterial({ color });
    const bulb = new THREE.Mesh(bulbGeo, m);
    bulb.position.copy(curve.getPoint((i + 0.5) / count)); bulb.position.y -= 0.02;
    g.add(bulb); bulbs.push({ m, ph: Math.random() * 6.28 });
  }
  const base = new THREE.Color(color);
  return {
    object: g, colliders: [],
    update(t) { bulbs.forEach((o) => o.m.color.copy(base).multiplyScalar(0.75 + Math.sin(t * 1.6 + o.ph) * 0.25)); },
  };
}

// ---------------------------------------------------------------- planta colgante
/** Enredadera que cae desde una repisa (hojas en cadenas que se mecen). */
export function hangingPlant({ x, y, z, strands = 5, length = 0.5 }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0xc96f4a, roughness: 0.8 }));
  pot.position.y = 0.045; g.add(pot);
  const leafGeo = new THREE.SphereGeometry(0.022, 6, 4); leafGeo.scale(1, 0.5, 1.4);
  const leafMats = [0x4caf6a, 0x6fcf7f, 0x3a8f55].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  const chains = [];
  for (let s = 0; s < strands; s++) {
    const ang = (s / strands) * Math.PI * 2;
    const chain = new THREE.Group();
    chain.position.set(Math.cos(ang) * 0.06, 0.08, Math.sin(ang) * 0.06);
    const L = length * (0.6 + Math.random() * 0.6);
    for (let d = 0; d < L; d += 0.045) {
      const leaf = new THREE.Mesh(leafGeo, leafMats[(s + Math.round(d * 50)) % 3]);
      leaf.position.set(Math.cos(ang) * d * 0.25, -d, Math.sin(ang) * d * 0.25);
      leaf.rotation.set(Math.random(), Math.random() * 6, Math.random());
      chain.add(leaf);
    }
    g.add(chain); chains.push({ chain, ph: Math.random() * 6 });
  }
  return { object: g, colliders: [], update(t) { chains.forEach((c) => { c.chain.rotation.z = Math.sin(t * 0.8 + c.ph) * 0.05; }); } };
}

// ---------------------------------------------------------------- pósters
export function poster(title, sub, hueA, hueB, w = 0.5, h = 0.7) {
  const tex = canvasTex(256, 360, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, `hsl(${hueA} 80% 45%)`); gr.addColorStop(1, `hsl(${hueB} 80% 20%)`);
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20);
    c.fillStyle = '#fff'; c.textAlign = 'center';
    c.font = 'bold 56px system-ui'; c.fillText(title, W / 2, H * 0.48);
    c.font = '22px system-ui'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText(sub, W / 2, H * 0.6);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
}
