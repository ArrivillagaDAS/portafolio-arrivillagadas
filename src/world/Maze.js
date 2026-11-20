import * as THREE from 'three';
import { litterBox } from './props.js';

// El laberinto es un jardín secreto al otro lado del túnel del arenero.
// Vive lejos del cuarto en la misma escena y solo se dibuja cuando el gato está ahí.
export const MAZE_ORIGIN = new THREE.Vector3(0, 0, 40);
const COLS = 8, ROWS = 8, CELL = 0.9, HEDGE_H = 0.62, HEDGE_T = 0.16;
const COLLIDER_H = 4; // muros invisibles muy altos: los setos no se pueden saltar

function rng(seed) { // mulberry32: laberinto igual en cada visita
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Genera el laberinto con DFS y calcula distancias desde la entrada. */
function generate(seed = 7) {
  const rand = rng(seed);
  const cells = Array.from({ length: COLS * ROWS }, () => ({ n: true, s: true, e: true, w: true, seen: false }));
  const at = (c, r) => cells[r * COLS + c];
  const stack = [[0, 0]]; at(0, 0).seen = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const opts = [[0, -1, 'n', 's'], [0, 1, 's', 'n'], [1, 0, 'e', 'w'], [-1, 0, 'w', 'e']]
      .filter(([dc, dr]) => { const nc = c + dc, nr = r + dr; return nc >= 0 && nr >= 0 && nc < COLS && nr < ROWS && !at(nc, nr).seen; });
    if (!opts.length) { stack.pop(); continue; }
    const [dc, dr, a, b] = opts[Math.floor(rand() * opts.length)];
    at(c, r)[a] = false; at(c + dc, r + dr)[b] = false; at(c + dc, r + dr).seen = true;
    stack.push([c + dc, r + dr]);
  }
  const dist = new Array(COLS * ROWS).fill(-1); dist[0] = 0;
  const q = [[0, 0]];
  while (q.length) {
    const [c, r] = q.shift(), cell = at(c, r), d = dist[r * COLS + c];
    for (const [dc, dr, k] of [[0, -1, 'n'], [0, 1, 's'], [1, 0, 'e'], [-1, 0, 'w']]) {
      const nc = c + dc, nr = r + dr;
      if (!cell[k] && dist[nr * COLS + nc] < 0) { dist[nr * COLS + nc] = d + 1; q.push([nc, nr]); }
    }
  }
  return { cells, at, dist };
}

function canvasTexture(size, draw, repeat = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Césped: base verde con briznas y manchas de luz. */
const grassTexture = () => canvasTexture(256, (g, s) => {
  g.fillStyle = '#5fae4a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,190,80' : '70,140,55'},0.25)`; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 10 + Math.random() * 25, 0, 7); g.fill(); }
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    g.strokeStyle = `hsl(${95 + Math.random() * 25} ${45 + Math.random() * 25}% ${32 + Math.random() * 25}%)`;
    g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 4); g.stroke();
  }
}, 6);

/** Seto: hojas apretadas en varios tonos de verde. */
const hedgeTexture = () => canvasTexture(128, (g, s) => {
  g.fillStyle = '#2f6b33'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `hsl(${105 + Math.random() * 25} ${40 + Math.random() * 25}% ${22 + Math.random() * 22}%)`;
    g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 3 + Math.random() * 3, 2 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill();
  }
});

function wingTexture(colorA, colorB) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(8, 32, 4, 20, 32, 40);
  grad.addColorStop(0, colorB); grad.addColorStop(1, colorA);
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(2, 32);
  g.bezierCurveTo(10, -4, 64, 0, 56, 24); g.bezierCurveTo(52, 32, 40, 32, 34, 34);
  g.bezierCurveTo(52, 40, 54, 60, 36, 60); g.bezierCurveTo(22, 62, 8, 46, 2, 32); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)';
  g.beginPath(); g.arc(40, 16, 4, 0, 7); g.fill(); g.beginPath(); g.arc(36, 50, 3, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeFish() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0xff9a1a, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), gold); body.scale.set(1.6, 1, 0.55); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), gold); tail.rotation.z = Math.PI / 2; tail.position.x = -0.12; g.add(tail);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  eye.position.set(0.06, 0.015, 0.03); g.add(eye);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 24), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  g.add(halo);
  g.userData.halo = halo;
  return g;
}

/**
 * Construye el jardín-laberinto.
 * @param {THREE.Scene} scene
 * @param {import('../physics/Physics.js').Physics} physics
 */
export function buildMaze(scene, physics) {
  const group = new THREE.Group();
  group.name = 'Maze';
  group.position.copy(MAZE_ORIGIN);
  scene.add(group);
  const rand = rng(99);
  const { cells, at, dist } = generate();
  const W = COLS * CELL, D = ROWS * CELL;
  const ox = -W / 2, oz = -D / 2;
  const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).add(MAZE_ORIGIN);
  const cellCenter = (c, r) => new THREE.Vector3(ox + (c + 0.5) * CELL, 0, oz + (r + 0.5) * CELL);
  const addBox = (x0, y0, z0, x1, y1, z1) => physics.addStaticBox(new THREE.Box3(toWorld(x0, y0, z0), toWorld(x1, y1, z1)));
  const animated = [];

  // ---------- pradera ----------
  const MEADOW = 16;
  const ground = new THREE.Mesh(new THREE.BoxGeometry(MEADOW, 0.1, MEADOW), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }));
  ground.position.y = -0.05; ground.receiveShadow = true; group.add(ground);
  addBox(-MEADOW / 2, -1, -MEADOW / 2, MEADOW / 2, 0, MEADOW / 2);

  // ---------- setos ----------
  const segs = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = at(c, r), x0 = ox + c * CELL, z0 = oz + r * CELL;
    if (cell.n) segs.push([x0, z0, x0 + CELL, z0]);
    if (cell.w) segs.push([x0, z0, x0, z0 + CELL]);
    if (r === ROWS - 1 && cell.s) segs.push([x0, z0 + CELL, x0 + CELL, z0 + CELL]);
    if (c === COLS - 1 && cell.e) segs.push([x0 + CELL, z0, x0 + CELL, z0 + CELL]);
  }
  const hedgeMat = new THREE.MeshStandardMaterial({ map: hedgeTexture(), roughness: 1 });
  const hedges = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hedgeMat, segs.length);
  // copa redondeada: esferas de hojas sobre cada seto
  const bushGeo = new THREE.IcosahedronGeometry(1, 1);
  const tufts = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  segs.forEach(([x0, z0, x1, z1], i) => {
    const horiz = z0 === z1;
    const sx = horiz ? CELL + HEDGE_T : HEDGE_T, sz = horiz ? HEDGE_T : CELL + HEDGE_T;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    m4.compose(new THREE.Vector3(cx, HEDGE_H / 2, cz), q, new THREE.Vector3(sx, HEDGE_H, sz));
    hedges.setMatrixAt(i, m4);
    addBox(cx - sx / 2, 0, cz - sz / 2, cx + sx / 2, COLLIDER_H, cz + sz / 2);
    for (let k = 0; k < 4; k++) {
      const u = (k + 0.5) / 4 - 0.5;
      tufts.push(new THREE.Vector3(cx + (horiz ? u * CELL : (rand() - 0.5) * 0.03), HEDGE_H - 0.01, cz + (horiz ? (rand() - 0.5) * 0.03 : u * CELL)));
    }
  });
  hedges.castShadow = true; hedges.receiveShadow = true;
  group.add(hedges);
  const tuftMesh = new THREE.InstancedMesh(bushGeo, hedgeMat, tufts.length);
  const green = new THREE.Color();
  tufts.forEach((p, i) => {
    const s = 0.11 + rand() * 0.05;
    m4.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand(), rand())), new THREE.Vector3(s, s * 0.8, s));
    tuftMesh.setMatrixAt(i, m4);
    tuftMesh.setColorAt(i, green.setHSL(0.3 + rand() * 0.05, 0.4, 0.75 + rand() * 0.25));
  });
  tuftMesh.castShadow = true;
  group.add(tuftMesh);

  // ---------- flores en los pasillos y en la pradera ----------
  const stems = [], heads = [];
  const petalColors = [0xff8fb8, 0xffe066, 0xffffff, 0xb79cff, 0xff9d5c, 0x8fd3ff];
  const addFlower = (x, z) => { const h = 0.05 + rand() * 0.07; stems.push([x, z, h]); heads.push([x, z, h, petalColors[Math.floor(rand() * petalColors.length)]]); };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = cellCenter(c, r);
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      // flores pegadas a los bordes del pasillo para no estorbar
      const side = rand() < 0.5 ? -1 : 1, along = (rand() - 0.5) * CELL * 0.8;
      if (rand() < 0.5) addFlower(p.x + side * CELL * 0.36, p.z + along); else addFlower(p.x + along, p.z + side * CELL * 0.36);
    }
  }
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2, rr = W / 2 + 0.6 + rand() * 4.5;
    addFlower(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const stemMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4), new THREE.MeshStandardMaterial({ color: 0x3f8a3a }), stems.length);
  stems.forEach(([x, z, h], i) => { m4.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(1, h, 1)); stemMesh.setMatrixAt(i, m4); });
  const headGeo = new THREE.IcosahedronGeometry(0.022, 0); headGeo.scale(1, 0.55, 1);
  const headMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), heads.length);
  const col = new THREE.Color();
  heads.forEach(([x, z, h, c], i) => { m4.compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(1, 1, 1)); headMesh.setMatrixAt(i, m4); headMesh.setColorAt(i, col.set(c)); });
  group.add(stemMesh, headMesh);

  // ---------- árboles alrededor ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 1 });
  const leafMats = [0x4f9e45, 0x6cbf4f, 0x3f8a48].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rand() * 0.2, rr = W / 2 + 1.4 + rand() * 3;
    const tree = new THREE.Group();
    tree.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    const h = 0.8 + rand() * 0.9;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, h, 6), trunkMat); trunk.position.y = h / 2; trunk.castShadow = true; tree.add(trunk);
    for (let k = 0; k < 3; k++) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rand() * 0.25, 0), leafMats[(i + k) % 3]);
      crown.position.set((rand() - 0.5) * 0.3, h + k * 0.18, (rand() - 0.5) * 0.3); crown.castShadow = true; tree.add(crown);
    }
    group.add(tree);
  }
  // nubes esponjosas
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const cl = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + rand() * 0.3, 0), cloudMat);
      puff.position.set(k * 0.45 - 0.7, rand() * 0.2, (rand() - 0.5) * 0.3); cl.add(puff);
    }
    cl.position.set((rand() - 0.5) * 14, 4 + rand() * 1.5, (rand() - 0.5) * 14);
    group.add(cl); clouds.push(cl);
  }
  animated.push((t, dt) => clouds.forEach((c, i) => { c.position.x += dt * 0.12 * (1 + i * 0.1); if (c.position.x > 9) c.position.x = -9; }));

  // ---------- mariposas ----------
  const wingPairs = [['#ff8fb8', '#fff2a8'], ['#8fd3ff', '#ffffff'], ['#ffb347', '#ffe066'], ['#b79cff', '#ffd6f6'], ['#ffffff', '#fff7c2']];
  const wingGeo = new THREE.PlaneGeometry(0.09, 0.09); wingGeo.translate(0.045, 0, 0);
  const butterflies = [];
  for (let i = 0; i < 16; i++) {
    const [a, b] = wingPairs[i % wingPairs.length];
    const tex = wingTexture(a, b);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.05 });
    const bf = new THREE.Group();
    const L = new THREE.Mesh(wingGeo, mat), R = new THREE.Mesh(wingGeo, mat);
    R.scale.x = -1;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.04, 2, 4), new THREE.MeshBasicMaterial({ color: 0x2a1c18 }));
    body.rotation.x = Math.PI / 2;
    bf.add(L, R, body);
    bf.rotation.order = 'YXZ';
    group.add(bf);
    const home = cellCenter(Math.floor(rand() * COLS), Math.floor(rand() * ROWS));
    butterflies.push({ bf, L, R, home, ph: rand() * 10, sp: 0.4 + rand() * 0.5, r: 0.3 + rand() * 0.9, y: 0.35 + rand() * 0.6 });
  }
  const local = new THREE.Vector3();
  animated.push((t, dt) => {
    for (const o of butterflies) {
      o.ph += dt * o.sp;
      // vuelo errático en lazos (curva de Lissajous) + atracción suave hacia el gato
      const x = o.home.x + Math.sin(o.ph) * o.r + Math.sin(o.ph * 2.3) * 0.15;
      const z = o.home.z + Math.cos(o.ph * 0.8) * o.r;
      const y = o.y + Math.sin(o.ph * 3.1) * 0.12;
      const prev = o.bf.position.clone();
      o.bf.position.set(x, y, z);
      if (local.lengthSq() && Math.hypot(local.x - x, local.z - z) < 1.2) o.bf.position.lerp(local.clone().setY(0.55), 0.25);
      const dir = o.bf.position.clone().sub(prev);
      if (dir.lengthSq() > 1e-8) o.bf.rotation.y = Math.atan2(dir.x, dir.z);
      const flap = Math.sin(t * 18 + o.ph * 5) * 1.1;
      o.L.rotation.y = flap; o.R.rotation.y = -flap;
      o.bf.rotation.x = -0.3;
    }
  });

  // ---------- entrada y salida ----------
  const start = cellCenter(0, 0);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 1 }));
  hole.rotation.x = -Math.PI / 2; hole.position.set(start.x, 0.003, start.z); group.add(hole);
  const holeIn = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), new THREE.MeshBasicMaterial({ color: 0x1a0f08 }));
  holeIn.rotation.x = -Math.PI / 2; holeIn.position.set(start.x, 0.005, start.z); group.add(holeIn);

  let far = 0;
  dist.forEach((d, i) => { if (d > dist[far]) far = i; });
  const exitPos = cellCenter(far % COLS, Math.floor(far / COLS));
  const exitBox = litterBox({ x: exitPos.x, z: exitPos.z, glow: false });
  exitBox.object.scale.setScalar(0.85);
  group.add(exitBox.object);
  group.updateMatrixWorld(true); // cajas en coordenadas de mundo
  const exitInner = new THREE.Box3().setFromObject(exitBox.object.children[0]).expandByVector(new THREE.Vector3(-0.02, 0.3, -0.02));
  exitBox.object.children.slice(1, 5).forEach((w) => physics.addStaticBox(new THREE.Box3().setFromObject(w)));
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.18, 2.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beacon.position.set(exitPos.x, 1.1, exitPos.z); group.add(beacon);

  // ---------- pescados dorados en los callejones sin salida ----------
  const deadEnds = [];
  cells.forEach((cell, i) => {
    const open = ['n', 's', 'e', 'w'].filter((k) => !cell[k]).length;
    if (open === 1 && i !== 0 && i !== far) deadEnds.push(i);
  });
  deadEnds.sort((a, b) => dist[b] - dist[a]);
  const fishes = deadEnds.slice(0, 8).map((i) => {
    const f = makeFish();
    const p = cellCenter(i % COLS, Math.floor(i / COLS));
    f.position.set(p.x, 0.22, p.z);
    group.add(f);
    return { f, taken: false, pop: 0 };
  });

  let collected = 0;
  return {
    group,
    total: fishes.length,
    get collected() { return collected; },
    spawn: toWorld(start.x, 0.05, start.z),
    exitInner,
    shadowCenter: MAZE_ORIGIN.clone(),
    update(t, dt, ctx) {
      if (ctx?.catPos) local.copy(ctx.catPos).sub(MAZE_ORIGIN);
      animated.forEach((f) => f(t, dt));
      beacon.material.opacity = 0.16 + Math.sin(t * 3) * 0.06;
      exitBox.update(t);
      for (const o of fishes) {
        if (o.taken) {
          if (o.pop < 1) { o.pop += dt * 2.5; o.f.scale.setScalar(1 + o.pop * 1.5); o.f.position.y += dt * 1.2; o.f.traverse((m) => { if (m.material) { m.material.transparent = true; m.material.opacity = 1 - o.pop; } }); }
          else o.f.visible = false;
          continue;
        }
        o.f.rotation.y += dt * 2.5;
        o.f.position.y = 0.22 + Math.sin(t * 3 + o.f.position.x) * 0.04;
        if (ctx?.cameraPos) o.f.userData.halo.lookAt(ctx.cameraPos);
        if (ctx?.catPos && Math.hypot(local.x - o.f.position.x, local.z - o.f.position.z) < 0.26 && local.y < 0.6) {
          o.taken = true; collected++; ctx.onFish?.(collected, fishes.length);
        }
      }
    },
  };
}
