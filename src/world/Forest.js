import * as THREE from 'three';
import { yarnBall } from './props.js';
import { buildMaze } from './Maze.js';
import { grassField, bushes, flowers, butterflies } from './nature.js';
import { SITE, PROJECTS, MOTIVATIONS } from '../content.js';

// Bosque abierto: cada zona es una sección del portafolio.
// Unidades: metros. El gato mide 0.32 m.

export const WORLD = { half: 22 };

/** Zonas del mapa: centro, radio de activación y tipo de contenido que muestran. */
export const ZONES = [
  { id: 'start', name: 'Claro central', pos: [0, 0], radius: 0, color: 0xf2d58c, pad: 6.5 },
  { id: 'projects', name: 'Sendero de proyectos', pos: [0, 10.5], radius: 0, color: 0xff9d5c },
  { id: 'cabin', name: 'Cabaña: sobre mí', pos: [13, -1], radius: 3.2, color: 0xc98b5a, kind: 'about' },
  { id: 'maze', name: 'Laberinto de setos', pos: [0, -14], radius: 0, color: 0x6fbf5a, noPad: true },
  { id: 'lake', name: 'Lago', pos: [-13, -1], radius: 5.4, color: 0x6fb6e8, kind: 'lake', noPad: true },
  { id: 'playground', name: 'Zona de juegos', pos: [-10, 10], radius: 3.2, color: 0xb79cff, kind: 'play' },
  { id: 'skills', name: 'Casa del árbol: skills', pos: [11, 12], radius: 3.4, color: 0x9be36f, kind: 'skills' },
  { id: 'contact', name: 'Buzón: contacto', pos: [15.5, 5], radius: 1.8, color: 0xff6fb5, kind: 'contact' },
];
const Z = Object.fromEntries(ZONES.map((z) => [z.id, z]));
export const LAKE = { x: Z.lake.pos[0], z: Z.lake.pos[1], radius: 3.6 };
const MAZE_HALF = 3.6;

// fuente de bloques 3x5 (fila superior primero)
const FONT = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '011', '001'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
};

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Letrero flotante con texto (siempre mira a la cámara); su ancho se ajusta al texto. */
function label(text, color = '#ffffff', scale = 1) {
  const font = 'bold 54px system-ui, sans-serif';
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 96;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(27,31,59,0.78)';
  g.beginPath(); g.roundRect(8, 20, w - 16, 88, 44); g.fill();
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color; g.fillText(text, w / 2, 66);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(0.6 * scale * (w / 128), 0.6 * scale, 1);
  return s;
}

/**
 * @param {THREE.Scene} scene
 * @param {import('../physics/Physics.js').Physics} physics
 * @param {{ lowQuality?: boolean }} [opts]
 */
export function buildForest(scene, physics, { lowQuality = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Forest';
  scene.add(group);
  const H = WORLD.half;
  const rand = rng(42);
  const triggers = [];   // { zone, pos: Vector3, radius, data, minY? }
  const animated = [];   // (t, dt, ctx) => void
  const box3 = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
  const solid = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); mesh.updateMatrixWorld(true); physics.addStaticBox(new THREE.Box3().setFromObject(mesh)); return mesh; };
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);

  // ---------- terreno ----------
  const ground = new THREE.Mesh(new THREE.BoxGeometry(H * 2, 0.2, H * 2), mat(0x6fae4f));
  ground.position.y = -0.1; ground.receiveShadow = true; group.add(ground);
  physics.addStaticBox(box3(-H - 2, -2, -H - 2, H + 2, 0, H + 2));
  const hillMat = mat(0x5a9a45, { flatShading: true });
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = H - 0.6 + rand() * 1.2;
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + rand() * 1.6, 1), hillMat);
    hill.position.set(Math.cos(a) * r, -0.2, Math.sin(a) * r); hill.scale.y = 0.55;
    hill.receiveShadow = true; group.add(hill);
  }
  for (const b of [box3(-H - 3, 0, -H - 3, H + 3, 8, -H + 1), box3(-H - 3, 0, H - 1, H + 3, 8, H + 3),
    box3(-H - 3, 0, -H, -H + 1, 8, H), box3(H - 1, 0, -H, H + 3, 8, H)]) physics.addStaticBox(b);

  // ---------- caminos desde el claro hacia cada zona ----------
  const pathMat = mat(0xd8c08a);
  const segments = [];
  const pathTo = (x, z, width = 1.3) => {
    const len = Math.hypot(x, z);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(width, len), pathMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = -Math.atan2(x, z);
    p.position.set(x / 2, 0.006, z / 2); p.receiveShadow = true; group.add(p);
    segments.push([x, z]);
  };
  for (const z of ZONES) {
    if (z.id === 'start') continue;
    if (z.id === 'maze') pathTo(0, -(14 - MAZE_HALF) + 0.1); // hasta la entrada del laberinto
    else pathTo(z.pos[0] * 0.86, z.pos[1] * 0.86);
  }
  const nearPath = (x, z, pad = 0.9) => segments.some(([ax, az]) => {
    const L2 = ax * ax + az * az || 1, t = Math.max(0, Math.min(1, (x * ax + z * az) / L2));
    return Math.hypot(x - ax * t, z - az * t) < pad;
  });

  // ---------- pad + letrero por zona ----------
  for (const z of ZONES) {
    if (!z.noPad) {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(z.pad ?? 2.6, 48), mat(z.color, { transparent: true, opacity: 0.5 }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(z.pos[0], 0.008, z.pos[1]); pad.receiveShadow = true; group.add(pad);
    }
    if (z.id !== 'start') {
      const l = label(z.name, '#fff3e4');
      const lp = z.id === 'maze' ? V(0, -(14 - MAZE_HALF) + 1.4, 1.6) : z.id === 'skills' ? V(z.pos[0] - 2.6, z.pos[1] - 2.6, 2.2) : V(z.pos[0], z.pos[1], 2.6);
      l.position.copy(lp); group.add(l);
    }
  }

  // ---------- claro central: nombre en bloques que se pueden derribar ----------
  {
    const name = SITE.name.toUpperCase();
    const cell = 0.15, gap = cell * 1.3, letterW = cell * 3;
    const total = name.length * letterW + (name.length - 1) * gap;
    let x = -total / 2;
    const blockMats = [0xff6fb5, 0xffafcc, 0xffd23f, 0x6fd3ff, 0xb79cff].map((c) => mat(c));
    const cube = new THREE.BoxGeometry(cell * 0.96, cell * 0.96, cell * 0.96);
    [...name].forEach((ch, i) => {
      const rows = FONT[ch];
      if (!rows) { x += letterW + gap; return; }
      const pivot = new THREE.Group();
      const boxes = [];
      rows.forEach((row, r) => [...row].forEach((bit, c) => {
        if (bit !== '1') return;
        const lx = (c - 1) * cell, ly = (2 - r) * cell;
        const m = new THREE.Mesh(cube, blockMats[i % blockMats.length]);
        m.position.set(lx, ly, 0); m.castShadow = true; m.receiveShadow = true; pivot.add(m);
        boxes.push({ x: lx, y: ly, z: 0, hx: cell / 2, hy: cell / 2, hz: cell / 2 });
      }));
      pivot.position.set(x + letterW / 2, cell * 2.5 + 0.002, -2.6);
      group.add(pivot);
      physics.addDynamicCompound(pivot, boxes, { density: 0.35 });
      x += letterW + gap;
    });
    const sub = label(SITE.role, '#fff3e4', 1.1);
    sub.position.set(0, 1.5, -2.6); group.add(sub);
  }

  // ---------- sendero de proyectos: un letrero por proyecto ----------
  const wood = mat(0xa8744a), board = mat(0xfff3e4);
  PROJECTS.forEach((p, i) => {
    const n = PROJECTS.length;
    const sx = (i - (n - 1) / 2) * 2.4, sz = 10 + (i % 2) * 1.3;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), wood); post.position.set(sx, 0.5, sz); solid(post);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.08), board); b.position.set(sx, 1.15, sz); solid(b);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.085), mat(0xff6fb5)); stripe.position.set(sx, 1.42, sz); group.add(stripe);
    const l = label(`${i + 1}. ${p.title}`, '#ffd6ea', 0.8); l.position.set(sx, 1.95, sz); group.add(l);
    triggers.push({ zone: 'projects', pos: V(sx, sz + 0.6), radius: 1.2, data: { index: i } });
  });

  // ---------- cabaña ----------
  {
    const [cx, cz] = Z.cabin.pos;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3.4), mat(0xc98b5a)); walls.position.set(cx, 1.2, cz); solid(walls);
    for (let y = 0.3; y < 2.4; y += 0.3) { // troncos horizontales
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.42, 8), mat(0xb07a4e)); log.rotation.x = Math.PI / 2; log.position.set(cx - 2.01, y, cz); group.add(log);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.6, 4), mat(0x7a3b2e)); roof.position.set(cx, 3.2, cz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.9), mat(0x5b3a26)); door.position.set(cx - 2.03, 0.75, cz); group.add(door);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd27a })); win.position.set(cx - 2.03, 1.5, cz + 1.0); win.rotation.y = -Math.PI / 2; group.add(win);
  }

  // ---------- laberinto de setos (jardín secreto) ----------
  const maze = buildMaze(scene, physics, { origin: V(Z.maze.pos[0], Z.maze.pos[1]), embedded: true, fishCount: MOTIVATIONS.length });
  triggers.push({ zone: 'maze', pos: V(0, -(14 - MAZE_HALF) + 1.0), radius: 1.6, data: {} });

  // ---------- lago (se puede entrar; al gato no le gusta) ----------
  {
    const water = new THREE.Mesh(new THREE.CircleGeometry(LAKE.radius, 64), new THREE.MeshStandardMaterial({ color: 0x4fa3d8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.set(LAKE.x, 0.03, LAKE.z); group.add(water);
    const bed = new THREE.Mesh(new THREE.CircleGeometry(LAKE.radius, 64), mat(0x2f6f8f)); bed.rotation.x = -Math.PI / 2; bed.position.set(LAKE.x, 0.007, LAKE.z); group.add(bed);
    const shore = new THREE.Mesh(new THREE.RingGeometry(LAKE.radius, LAKE.radius + 0.5, 64), mat(0xd9c48f)); shore.rotation.x = -Math.PI / 2; shore.position.set(LAKE.x, 0.012, LAKE.z); group.add(shore);
    // nenúfares y piedras
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2, r = 0.8 + rand() * (LAKE.radius - 1.2);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.22 + rand() * 0.12, 12, 0.3, Math.PI * 1.8), mat(0x4caf6a));
      pad.rotation.x = -Math.PI / 2; pad.position.set(LAKE.x + Math.cos(a) * r, 0.035, LAKE.z + Math.sin(a) * r); group.add(pad);
      if (i % 3 === 0) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), mat(0xffafcc)); fl.position.copy(pad.position).setY(0.07); group.add(fl); }
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rand() * 0.3;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + rand() * 0.25, 0), mat(0x8b8f99, { flatShading: true }));
      rock.position.set(LAKE.x + Math.cos(a) * (LAKE.radius + 0.6), 0.05, LAKE.z + Math.sin(a) * (LAKE.radius + 0.6)); rock.scale.y = 0.6; rock.castShadow = true; group.add(rock);
    }
    // ondas en el agua cuando el gato chapotea
    const ripples = [];
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.position.y = 0.04; group.add(r); ripples.push({ r, life: 0 });
    }
    let next = 0, acc = 0;
    animated.push((t, dt, ctx) => {
      water.material.color.setHSL(0.56, 0.6, 0.52 + Math.sin(t * 0.8) * 0.03);
      acc += dt;
      if (ctx?.inWater && acc > 0.22) {
        acc = 0;
        const o = ripples[next++ % ripples.length];
        o.life = 1; o.r.position.x = ctx.catPos.x; o.r.position.z = ctx.catPos.z;
      }
      for (const o of ripples) {
        if (o.life <= 0) continue;
        o.life -= dt * 1.2;
        o.r.scale.setScalar(1 + (1 - o.life) * 5);
        o.r.material.opacity = Math.max(0, o.life) * 0.7;
      }
    });
  }

  // ---------- zona de juegos: latas como bolos y estambres ----------
  {
    const [px, pz] = Z.playground.pos;
    const canGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12);
    const canMats = [0xff6fb5, 0x38e1ff, 0xffd23f].map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3 }));
    let k = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) {
      const can = new THREE.Mesh(canGeo, canMats[k++ % 3]);
      can.position.set(px + (i - row / 2) * 0.15, 0.081, pz - 0.8 - row * 0.14); can.castShadow = true; group.add(can);
      physics.addDynamicBox(can, new THREE.Vector3(0.06, 0.08, 0.06), { density: 0.15, restitution: 0.3 });
    }
    for (const [c, dx, dz] of [[0xff6fb5, 1.2, 0.6], [0x38e1ff, -1.1, 0.9], [0xffd23f, 0.2, 1.4]]) {
      const ball = yarnBall(c, 0.1); ball.position.set(px + dx, 0.11, pz + dz); group.add(ball);
      physics.addDynamicBall(ball, 0.1);
    }
  }

  // ---------- casa del árbol: parkour en espiral con premio arriba ----------
  const tree = (() => {
    const [tx, tz] = Z.skills.pos;
    const DECK_Y = 5.4, DECK_R = 1.7, STEP_R = 2.2;
    const bark = mat(0x7a5236, { flatShading: true }), plank = mat(0xb9844f), plankDark = mat(0x8a5a33);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, DECK_Y + 1.4, 10), bark);
    trunk.position.set(tx, (DECK_Y + 1.4) / 2, tz); trunk.castShadow = true; group.add(trunk);
    physics.addStaticCylinder(V(tx, tz), 0.55, DECK_Y + 1.4);
    for (let i = 0; i < 5; i++) { // raíces
      const a = (i / 5) * Math.PI * 2;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 1.1, 6), bark);
      root.position.set(tx + Math.cos(a) * 0.65, 0.2, tz + Math.sin(a) * 0.65); root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); group.add(root);
    }
    // plataforma de la casa
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(DECK_R, DECK_R, 0.14, 24), plank);
    deck.position.set(tx, DECK_Y - 0.07, tz); deck.castShadow = true; deck.receiveShadow = true; group.add(deck);
    physics.addStaticCylinder(V(tx, tz, DECK_Y - 0.14), DECK_R, 0.14);
    // casita sobre la plataforma (lado opuesto a la llegada)
    const arrive = Math.atan2(-tz, -tx); // dirección hacia el claro central
    const hdir = new THREE.Vector3(Math.cos(arrive + Math.PI), 0, Math.sin(arrive + Math.PI));
    const house = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.1), mat(0xffafcc));
    house.position.set(tx + hdir.x * 0.85, DECK_Y + 0.5, tz + hdir.z * 0.85); house.rotation.y = -arrive; solid(house);
    const hroof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.7, 4), mat(0x1b1f3b));
    hroof.position.set(house.position.x, DECK_Y + 1.35, house.position.z); hroof.rotation.y = -arrive + Math.PI / 4; hroof.castShadow = true; group.add(hroof);
    // barandal con postes (hueco en la llegada)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      let d = Math.atan2(Math.sin(a - arrive), Math.cos(a - arrive));
      if (Math.abs(d) < 0.55) continue;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), plankDark);
      post.position.set(tx + Math.cos(a) * (DECK_R - 0.05), DECK_Y + 0.2, tz + Math.sin(a) * (DECK_R - 0.05)); group.add(post);
    }
    // copa del árbol por encima de la casa (se vuelve transparente si el gato está arriba)
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x5fae4a, roughness: 1, flatShading: true, transparent: true });
    for (const [dx, dy, dz, s] of [[0, 7.6, 0, 2.2], [1.3, 7.1, 0.4, 1.5], [-1.2, 7.2, -0.5, 1.6], [0.3, 8.4, -0.8, 1.4]]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), crownMat); c.position.set(tx + dx, dy, tz + dz); c.castShadow = true; group.add(c);
    }

    // escalones en espiral: discos de madera, troncos y hongos
    const steps = [];
    const N = 14, dA = (26 * Math.PI) / 180;
    const mushCap = mat(0xff6f91), mushStem = mat(0xfff3e4), dot = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < N; i++) {
      const a = arrive + Math.PI * 0.35 + i * dA;
      const y = 0.38 + i * 0.37;
      const sx = tx + Math.cos(a) * STEP_R, sz = tz + Math.sin(a) * STEP_R;
      const type = i % 3; // 0 disco, 1 tronco, 2 hongo
      let top;
      if (type === 0) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 16), plank); disc.position.set(sx, y - 0.05, sz); disc.castShadow = true; group.add(disc);
        physics.addStaticCylinder(V(sx, sz, y - 0.1), 0.36, 0.1);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, STEP_R - 0.5, 6), bark); // rama que lo sostiene
        arm.position.set((sx + tx) / 2, y - 0.14, (sz + tz) / 2); arm.rotation.z = Math.PI / 2; arm.rotation.y = -a; group.add(arm);
        top = disc;
      } else if (type === 1) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.85, 10), bark);
        log.rotation.z = Math.PI / 2; log.rotation.y = -a + Math.PI / 2; log.position.set(sx, y - 0.17, sz); log.castShadow = true; group.add(log);
        log.updateMatrixWorld(true); physics.addStaticBox(new THREE.Box3().setFromObject(log).expandByVector(new THREE.Vector3(-0.08, 0, -0.08)));
        top = log;
      } else {
        if (y < 1.2) { // hongo con tallo solo cerca del suelo; los altos salen de una rama
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, y, 8), mushStem); stem.position.set(sx, y / 2, sz); group.add(stem);
        } else {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, STEP_R - 0.4, 6), bark);
          arm.position.set((sx + tx) / 2, y - 0.2, (sz + tz) / 2); arm.rotation.z = Math.PI / 2; arm.rotation.y = -a; group.add(arm);
        }
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mushCap); cap.scale.y = 0.45; cap.position.set(sx, y - 0.16, sz); cap.castShadow = true; group.add(cap);
        for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), dot); const da = k * 1.3; d.position.set(sx + Math.cos(da) * 0.22, y - 0.02, sz + Math.sin(da) * 0.22); d.rotation.x = -Math.PI / 2; group.add(d); }
        physics.addStaticCylinder(V(sx, sz, y - 0.16), 0.4, 0.16);
        top = cap;
      }
      // farol de progreso: se enciende cuando el gato llega a ese escalón
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0x5a4a3a }));
      lamp.position.set(sx, y + 0.42, sz); group.add(lamp);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.35), new THREE.MeshBasicMaterial({ color: 0x3a2a1a })); cord.position.set(sx, y + 0.63, sz); group.add(cord);
      steps.push({ x: sx, z: sz, y, lamp, lit: false, top });
    }

    // cofre con la corona
    const chestPos = V(tx + Math.cos(arrive) * 0.55, tz + Math.sin(arrive) * 0.55, DECK_Y);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.3), mat(0x8a5a33)); chest.position.copy(chestPos).setY(DECK_Y + 0.13); chest.rotation.y = -arrive; solid(chest);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.32), mat(0xffc83d, { metalness: 0.6, roughness: 0.3 })); lid.position.copy(chest.position).setY(DECK_Y + 0.3); lid.rotation.y = -arrive; group.add(lid);
    const prizeCrown = new THREE.Group();
    const gold = mat(0xffc83d, { metalness: 0.85, roughness: 0.25, emissive: 0x5a3a00, emissiveIntensity: 0.4 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20, 1, true), gold); band.material.side = THREE.DoubleSide; prizeCrown.add(band);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), gold); sp.position.set(Math.cos(a) * 0.13, 0.09, Math.sin(a) * 0.13); prizeCrown.add(sp); }
    prizeCrown.position.copy(chestPos).setY(DECK_Y + 0.75); group.add(prizeCrown);
    const glow = new THREE.PointLight(0xffd27a, 2, 3, 1.6); glow.position.copy(prizeCrown.position); group.add(glow);
    // chispas alrededor de la corona
    const sparkGeo = new THREE.OctahedronGeometry(0.025);
    const sparks = Array.from({ length: 10 }, (_, i) => { const s = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); group.add(s); return { s, ph: i * 0.63 }; });

    const prize = { pos: chestPos.clone().setY(DECK_Y), taken: false };
    animated.push((t, dt, ctx) => {
      const cat = ctx?.catPos;
      // la copa se vuelve transparente si el gato trepa (para que la cámara vea)
      const high = cat && cat.y > 2.2 && Math.hypot(cat.x - tx, cat.z - tz) < 4;
      crownMat.opacity += ((high ? 0.25 : 1) - crownMat.opacity) * Math.min(1, dt * 4);
      crownMat.depthWrite = crownMat.opacity > 0.9;
      if (cat) for (const s of steps) {
        if (!s.lit && Math.hypot(cat.x - s.x, cat.z - s.z) < 0.55 && Math.abs(cat.y - s.y) < 0.25) { s.lit = true; s.lamp.material.color.set(0xffd27a); ctx.onStep?.(steps.filter((q) => q.lit).length, steps.length); }
      }
      if (!prize.taken) {
        prizeCrown.rotation.y += dt * 1.5;
        prizeCrown.position.y = DECK_Y + 0.75 + Math.sin(t * 2) * 0.06;
        sparks.forEach((o) => { const a = t * 1.5 + o.ph; o.s.position.set(prizeCrown.position.x + Math.cos(a) * 0.35, prizeCrown.position.y + Math.sin(a * 1.7) * 0.15, prizeCrown.position.z + Math.sin(a) * 0.35); o.s.rotation.y += dt * 4; });
      }
    });
    return {
      prize,
      takePrize() {
        prize.taken = true;
        prizeCrown.visible = false; glow.intensity = 0.4;
        sparks.forEach((o) => { o.s.visible = false; });
        lid.rotation.x = -1.1; lid.position.y += 0.12;
      },
      resetIfUnlocked(unlocked) { if (unlocked) this.takePrize(); },
    };
  })();

  // ---------- buzón de contacto ----------
  {
    const [bx, bz] = Z.contact.pos;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0x6b4a33)); post.position.set(bx, 0.45, bz); solid(post);
    const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.3), mat(0xff6fb5)); mailbox.position.set(bx, 1.05, bz); solid(mailbox);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.1), mat(0xffd23f)); flag.position.set(bx + 0.27, 1.15, bz); group.add(flag);
    animated.push((t) => { flag.rotation.z = Math.sin(t * 3) * 0.15; });
  }

  // ---------- dónde puede ir la vegetación ----------
  const inMaze = (x, z, pad = 0) => Math.abs(x - Z.maze.pos[0]) < MAZE_HALF + pad && Math.abs(z - Z.maze.pos[1]) < MAZE_HALF + pad;
  const inLake = (x, z, pad = 0) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius + pad;
  const inZone = (x, z, pad) => ZONES.some((zn) => !zn.noPad && Math.hypot(x - zn.pos[0], z - zn.pos[1]) < (zn.pad ?? 2.6) + pad);
  const nearCabin = (x, z, pad) => Math.abs(x - Z.cabin.pos[0]) < 2 + pad && Math.abs(z - Z.cabin.pos[1]) < 1.7 + pad;
  const nearTree = (x, z, pad) => Math.hypot(x - Z.skills.pos[0], z - Z.skills.pos[1]) < 2.8 + pad;
  const nearProjects = (x, z, pad) => Math.abs(x) < 6.5 + pad && Math.abs(z - 10.6) < 1.4 + pad;
  const blocked = (x, z, pad) => inMaze(x, z, pad) || inLake(x, z, pad) || inZone(x, z, pad) || nearCabin(x, z, pad) || nearTree(x, z, pad) || nearProjects(x, z, pad) || Math.abs(x) > H - 1.5 || Math.abs(z) > H - 1.5;

  // árboles redondos y algunos pinos
  const trees = [];
  for (let i = 0; i < 600 && trees.length < 95; i++) {
    const x = (rand() * 2 - 1) * (H - 2), z = (rand() * 2 - 1) * (H - 2);
    if (!blocked(x, z, 2.2) && !nearPath(x, z, 2.0)) trees.push([x, z, 0.8 + rand() * 0.7, rand() < 0.65]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 6);
  const roundGeo = new THREE.IcosahedronGeometry(1, 1), pineGeo = new THREE.ConeGeometry(1, 2, 7);
  const round = trees.filter((t) => t[3]), pines = trees.filter((t) => !t[3]);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, mat(0x7a5236), trees.length);
  const roundMesh = new THREE.InstancedMesh(roundGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), round.length);
  const pineMesh = new THREE.InstancedMesh(pineGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), pines.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  trees.forEach(([x, z, s], i) => {
    m4.compose(V(x, z, 0.6 * s), q, new THREE.Vector3(s, s * 1.2, s)); trunkMesh.setMatrixAt(i, m4);
    physics.addStaticCylinder(V(x, z), 0.16 * s, 1.4 * s);
  });
  round.forEach(([x, z, s], i) => {
    m4.compose(V(x, z, 1.9 * s), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand(), rand())), new THREE.Vector3(s * 1.1, s, s * 1.1)); roundMesh.setMatrixAt(i, m4);
    roundMesh.setColorAt(i, c.setHSL(0.27 + rand() * 0.06, 0.45, 0.34 + rand() * 0.1));
  });
  pines.forEach(([x, z, s], i) => {
    m4.compose(V(x, z, 2.1 * s), q, new THREE.Vector3(s * 0.8, s, s * 0.8)); pineMesh.setMatrixAt(i, m4);
    pineMesh.setColorAt(i, c.setHSL(0.32 + rand() * 0.05, 0.4, 0.26 + rand() * 0.08));
  });
  trunkMesh.castShadow = roundMesh.castShadow = pineMesh.castShadow = true;
  group.add(trunkMesh, roundMesh, pineMesh);

  // arbustos redondos a lo largo de caminos y bordes
  const bushSpots = [];
  for (let i = 0; i < 900 && bushSpots.length < 70; i++) {
    const x = (rand() * 2 - 1) * (H - 2), z = (rand() * 2 - 1) * (H - 2);
    if (!blocked(x, z, 0.9) && !nearPath(x, z, 1.1) && (nearPath(x, z, 2.6) || rand() < 0.35)) bushSpots.push([x, z, 0.35 + rand() * 0.3]);
  }
  group.add(bushes({ spots: bushSpots, rand, physics }).object);

  // flores
  const flowerSpots = [];
  for (let i = 0; i < 4000 && flowerSpots.length < 650; i++) {
    const x = (rand() * 2 - 1) * (H - 1.5), z = (rand() * 2 - 1) * (H - 1.5);
    if (!inMaze(x, z, 0.2) && !inLake(x, z, 0.4) && !nearPath(x, z, 0.75) && !nearTree(x, z, 0.2)) flowerSpots.push([x, z, 0.05 + rand() * 0.08, Math.floor(rand() * 6)]);
  }
  group.add(flowers({ spots: flowerSpots }).object);

  // pasto con viento (fuera de caminos, agua y edificios)
  const grass = grassField({
    half: H - 1.2, count: lowQuality ? 16000 : 42000, rand,
    allowed: (x, z) => !inMaze(x, z, 0.1) && !inLake(x, z, 0.3) && !nearPath(x, z, 0.72) && !nearCabin(x, z, 0.1) && Math.hypot(x, z) > 3.2,
  });
  group.add(grass.object);

  // mariposas por todo el bosque
  const homes = Array.from({ length: 14 }, () => { let x, z; do { x = (rand() * 2 - 1) * 16; z = (rand() * 2 - 1) * 16; } while (inMaze(x, z, 1)); return V(x, z); });
  const bfs = butterflies({ homes, rand });
  group.add(bfs.object);

  // nubes
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Group();
    for (let k = 0; k < 4; k++) { const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rand() * 0.6, 0), cloudMat); puff.position.set(k * 0.9 - 1.4, rand() * 0.4, (rand() - 0.5) * 0.6); cl.add(puff); }
    cl.position.set((rand() - 0.5) * 40, 9 + rand() * 3, (rand() - 0.5) * 40); group.add(cl); clouds.push(cl);
  }

  // ---------- zonas como disparadores ----------
  for (const zn of ZONES) if (zn.radius) triggers.push({ zone: zn.id, pos: V(zn.pos[0], zn.pos[1]), radius: zn.radius, data: {}, maxY: zn.id === 'skills' ? 1.5 : 99 });

  return {
    group,
    maze,
    tree,
    lake: LAKE,
    spawn: V(0, 1.2, 0.05),
    triggers,
    update(t, dt, ctx) {
      animated.forEach((f) => f(t, dt, ctx));
      grass.update(t, ctx?.catPos);
      bfs.update(t, dt, ctx?.catPos);
      clouds.forEach((cl, i) => { cl.position.x += dt * 0.25 * (1 + i * 0.05); if (cl.position.x > 24) cl.position.x = -24; });
      maze.update(t, dt, ctx);
    },
  };
}
