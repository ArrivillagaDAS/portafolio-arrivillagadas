import * as THREE from 'three';
import { yarnBall } from './props.js';
import { SITE, PROJECTS } from '../content.js';

// Mundo abierto en "caja gris": terreno, caminos y un bloque por zona.
// Sirve para validar tamaños, distancias y sensación antes de decorar.
// Unidades: metros. El gato mide 0.32 m.

export const WORLD = { half: 22 };

/** Zonas del mapa: centro, radio de activación y tipo de contenido que muestran. */
export const ZONES = [
  { id: 'start', name: 'Claro central', pos: [0, 0], radius: 0, color: 0xf2d58c },
  { id: 'projects', name: 'Sendero de proyectos', pos: [0, 10], radius: 0, color: 0xff9d5c },
  { id: 'cabin', name: 'Cabaña', pos: [13, -1], radius: 3.2, color: 0xc98b5a, kind: 'about' },
  { id: 'maze', name: 'Laberinto de setos', pos: [0, -14], radius: 3.5, color: 0x6fbf5a, kind: 'maze' },
  { id: 'lake', name: 'Lago', pos: [-13, -1], radius: 5.2, color: 0x6fb6e8, kind: 'lake' },
  { id: 'playground', name: 'Zona de juegos', pos: [-10, 10], radius: 3.2, color: 0xb79cff, kind: 'play' },
  { id: 'skills', name: 'Árbol de habilidades', pos: [10, 11], radius: 3, color: 0x9be36f, kind: 'skills' },
  { id: 'contact', name: 'Buzón', pos: [15, 6], radius: 1.8, color: 0xff6f91, kind: 'contact' },
];

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

/** Letrero flotante con texto (siempre mira a la cámara). */
function label(text, color = '#ffffff', scale = 1) {
  // el ancho del letrero se ajusta al texto para que nunca se corte
  const font = 'bold 54px system-ui, sans-serif';
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 96;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(20,16,30,0.72)';
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
 */
export function buildForest(scene, physics) {
  const group = new THREE.Group();
  group.name = 'Forest';
  scene.add(group);
  const H = WORLD.half;
  const rand = rng(42);
  const triggers = [];   // { zone, pos: Vector3, radius, data }
  const animated = [];
  const box3 = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
  const solid = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); mesh.updateMatrixWorld(true); physics.addStaticBox(new THREE.Box3().setFromObject(mesh)); return mesh; };
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);

  // ---------- terreno ----------
  const ground = new THREE.Mesh(new THREE.BoxGeometry(H * 2, 0.2, H * 2), mat(0x86c46a));
  ground.position.y = -0.1; ground.receiveShadow = true; group.add(ground);
  physics.addStaticBox(box3(-H - 2, -2, -H - 2, H + 2, 0, H + 2));
  // borde del mapa: colinas bajas visibles + muro invisible
  const hillMat = mat(0x6aa856);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, r = H - 0.8 + rand() * 1.2;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1.6 + rand() * 1.4, 10, 8), hillMat);
    hill.position.set(Math.cos(a) * r * 1.02, -0.3, Math.sin(a) * r * 1.02); hill.scale.y = 0.6;
    hill.receiveShadow = true; group.add(hill);
  }
  for (const b of [box3(-H - 3, 0, -H - 3, H + 3, 6, -H + 1), box3(-H - 3, 0, H - 1, H + 3, 6, H + 3),
    box3(-H - 3, 0, -H, -H + 1, 6, H), box3(H - 1, 0, -H, H + 3, 6, H)]) physics.addStaticBox(b);

  // ---------- caminos desde el claro hacia cada zona ----------
  const pathMat = mat(0xd9c48f);
  const pathTo = (x, z, width = 1.3) => {
    const len = Math.hypot(x, z);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(width, len), pathMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = -Math.atan2(x, z);
    p.position.set(x / 2, 0.005, z / 2); p.receiveShadow = true; group.add(p);
  };
  for (const z of ZONES) if (z.id !== 'start') pathTo(z.pos[0] * 0.86, z.pos[1] * 0.86);

  // ---------- pad + letrero por zona ----------
  for (const z of ZONES) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(z.id === 'start' ? 4.5 : 2.6, 40), mat(z.color));
    pad.rotation.x = -Math.PI / 2; pad.position.set(z.pos[0], 0.008, z.pos[1]); pad.receiveShadow = true;
    pad.material.transparent = true; pad.material.opacity = 0.55; group.add(pad);
    if (z.id !== 'start') {
      const l = label(z.name, '#fff6d8');
      l.position.set(z.pos[0], 2.6, z.pos[1]); group.add(l);
    }
  }

  // ---------- claro central: nombre en bloques que se pueden derribar ----------
  {
    const name = SITE.name.toUpperCase();
    const cell = 0.15, gap = cell * 1.3;
    const letterW = cell * 3;
    const total = name.length * letterW + (name.length - 1) * gap;
    let x = -total / 2;
    const blockMats = [0xff9d5c, 0xffd23f, 0x6fd3ff, 0xff6f91, 0xb79cff].map(mat);
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
    const sub = label(SITE.role, '#fff6d8', 1.1); // letrero sobre el nombre
    sub.position.set(0, 1.45, -2.6); group.add(sub);
  }

  // ---------- sendero de proyectos: un letrero por proyecto ----------
  const wood = mat(0xa8744a), board = mat(0xf2e2c4);
  PROJECTS.forEach((p, i) => {
    const n = PROJECTS.length;
    const sx = (i - (n - 1) / 2) * 2.6, sz = 10 + (i % 2) * 1.2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), wood); post.position.set(sx, 0.5, sz); solid(post);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.08), board); b.position.set(sx, 1.15, sz); solid(b);
    const l = label(`${i + 1}. ${p.title}`, '#ffe3c4', 0.8); l.position.set(sx, 1.95, sz); group.add(l);
    triggers.push({ zone: 'projects', pos: V(sx, sz + 0.6), radius: 1.3, data: { index: i } });
  });

  // ---------- cabaña (después: interior con el cuarto gamer) ----------
  {
    const [cx, cz] = ZONES.find((z) => z.id === 'cabin').pos;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3.4), mat(0xc98b5a)); walls.position.set(cx, 1.2, cz); solid(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.6, 4), mat(0x7a3b2e));
    roof.position.set(cx, 3.2, cz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.9), mat(0x5b3a26)); door.position.set(cx - 2.02, 0.75, cz); group.add(door);
  }

  // ---------- laberinto (marcador: anillo de setos con entrada) ----------
  {
    const [mx, mz] = ZONES.find((z) => z.id === 'maze').pos;
    const hedge = mat(0x3f8a3a), S = 3, h = 0.6, t = 0.3;
    const walls = [[mx - S, mz - S, mx + S, mz - S + t], [mx - S, mz - S, mx - S + t, mz + S], [mx + S - t, mz - S, mx + S, mz + S],
      [mx - S, mz + S - t, mx - 0.8, mz + S], [mx + 0.8, mz + S - t, mx + S, mz + S]];
    for (const [x0, z0, x1, z1] of walls) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), hedge); w.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); solid(w);
    }
  }

  // ---------- lago con borde (el gato no entra al agua) ----------
  {
    const [lx, lz] = ZONES.find((z) => z.id === 'lake').pos;
    const water = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), new THREE.MeshStandardMaterial({ color: 0x4fa3d8, roughness: 0.15, metalness: 0.1 }));
    water.rotation.x = -Math.PI / 2; water.position.set(lx, 0.02, lz); group.add(water);
    const shore = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.1, 48), mat(0xcbb98a)); shore.rotation.x = -Math.PI / 2; shore.position.set(lx, 0.015, lz); group.add(shore);
    physics.addStaticCylinder(V(lx, lz), 3.6, 0.5);
    animated.push((t) => { water.material.color.setHSL(0.56, 0.6, 0.55 + Math.sin(t * 0.8) * 0.03); });
  }

  // ---------- zona de juegos: latas como bolos y estambres ----------
  {
    const [px, pz] = ZONES.find((z) => z.id === 'playground').pos;
    const canGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12);
    const canMats = [0xff4fd8, 0x38e1ff, 0xffd23f].map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3 }));
    let k = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) {
      const can = new THREE.Mesh(canGeo, canMats[k++ % 3]);
      can.position.set(px + (i - row / 2) * 0.15, 0.081, pz - 0.8 - row * 0.14); can.castShadow = true; group.add(can);
      physics.addDynamicBox(can, new THREE.Vector3(0.06, 0.08, 0.06), { density: 0.15, restitution: 0.3 });
    }
    for (const [c, dx, dz] of [[0xff4fd8, 1.2, 0.6], [0x38e1ff, -1.1, 0.9], [0xffd23f, 0.2, 1.4]]) {
      const ball = yarnBall(c, 0.1); ball.position.set(px + dx, 0.11, pz + dz); group.add(ball);
      physics.addDynamicBall(ball, 0.1);
    }
  }

  // ---------- árbol de habilidades con faroles ----------
  {
    const [tx, tz] = ZONES.find((z) => z.id === 'skills').pos;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.6, 10), mat(0x7a5236)); trunk.position.set(tx, 1.3, tz); trunk.castShadow = true; group.add(trunk);
    physics.addStaticCylinder(V(tx, tz), 0.45, 2.6);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), new THREE.MeshStandardMaterial({ color: 0x5fae4a, roughness: 1, flatShading: true }));
    crown.position.set(tx, 3.6, tz); crown.castShadow = true; group.add(crown);
    const lanterns = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
      l.position.set(tx + Math.cos(a) * 1.6, 2.4 + (i % 3) * 0.25, tz + Math.sin(a) * 1.6); group.add(l); lanterns.push(l);
    }
    animated.push((t) => lanterns.forEach((l, i) => l.material.color.setHSL(0.11, 1, 0.6 + Math.sin(t * 2 + i) * 0.12)));
    // escalones para trepar (plataformas alrededor del tronco)
    for (const [dx, dz, y] of [[0.7, 0.2, 0.45], [0.2, 0.75, 0.9], [-0.6, 0.4, 1.35]]) {
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16), mat(0x9b6a43)); step.position.set(tx + dx, y, tz + dz); solid(step);
    }
  }

  // ---------- buzón de contacto ----------
  {
    const [bx, bz] = ZONES.find((z) => z.id === 'contact').pos;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0x6b4a33)); post.position.set(bx, 0.45, bz); solid(post);
    const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.3), mat(0xff6f91)); mailbox.position.set(bx, 1.05, bz); solid(mailbox);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.1), mat(0xffd23f)); flag.position.set(bx + 0.27, 1.15, bz); group.add(flag);
    animated.push((t) => { flag.rotation.z = Math.sin(t * 3) * 0.15; });
  }

  // ---------- árboles de relleno (fuera de zonas y caminos) ----------
  const free = (x, z) => {
    if (Math.hypot(x, z) < 6) return false;
    for (const zn of ZONES) if (Math.hypot(x - zn.pos[0], z - zn.pos[1]) < 4.8) return false;
    for (const zn of ZONES) { // distancia al segmento del camino
      const [ax, az] = zn.pos, L2 = ax * ax + az * az || 1;
      const t = Math.max(0, Math.min(1, (x * ax + z * az) / L2));
      if (Math.hypot(x - ax * t, z - az * t) < 1.6) return false;
    }
    return true;
  };
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 6), crownGeo = new THREE.ConeGeometry(1, 2, 7);
  const trees = [];
  for (let i = 0; i < 400 && trees.length < 110; i++) {
    const x = (rand() * 2 - 1) * (H - 2.5), z = (rand() * 2 - 1) * (H - 2.5);
    if (free(x, z)) trees.push([x, z, 0.8 + rand() * 0.7]);
  }
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, mat(0x7a5236), trees.length);
  const crownMesh = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), trees.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  trees.forEach(([x, z, s], i) => {
    m4.compose(V(x, z, 0.5 * s), q, new THREE.Vector3(s, s, s)); trunkMesh.setMatrixAt(i, m4);
    m4.compose(V(x, z, (1 + 1) * s), q, new THREE.Vector3(s * 0.9, s, s * 0.9)); crownMesh.setMatrixAt(i, m4);
    crownMesh.setColorAt(i, c.setHSL(0.28 + rand() * 0.06, 0.45, 0.32 + rand() * 0.12));
    physics.addStaticCylinder(V(x, z), 0.16 * s, 1.2 * s);
  });
  trunkMesh.castShadow = crownMesh.castShadow = true;
  group.add(trunkMesh, crownMesh);

  // ---------- zonas como disparadores ----------
  for (const z of ZONES) if (z.radius) triggers.push({ zone: z.id, pos: V(z.pos[0], z.pos[1]), radius: z.radius, data: {} });

  return {
    group,
    spawn: V(0, 1.2, 0.05),
    triggers,
    update(t, dt) { animated.forEach((f) => f(t, dt)); },
  };
}
