import * as THREE from 'three';
import { loadModel, place, pivotAtCenter } from './assets.js';
import { catTower, arcade, fishTank, litterBox, laserPointer, yarnBall, citySkyline, poster, jukebox, stringLights, hangingPlant } from './props.js';

// Unidades: metros. El kit de Kenney mide ~1.95 veces menos que la vida real.
const K = 1.95;
export const ROOM = { half: 3, height: 2.6 };
const H = ROOM.half, WH = ROOM.height;
const WIN = { z0: -1.6, z1: 0.2, y0: 0.85, y1: 2.0 };   // ventana (pared derecha)
const DOOR = { x0: -1.5, x1: -0.55, y1: 2.05 };          // puerta (pared del frente)

const B = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));

/** Pantalla con texto generado en canvas (luego mostrará vistas previas de proyectos). */
function screenTexture(title, lines, hue) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 320;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 512, 320);
  grad.addColorStop(0, `hsl(${hue} 70% 14%)`);
  grad.addColorStop(1, `hsl(${(hue + 60) % 360} 70% 8%)`);
  g.fillStyle = grad; g.fillRect(0, 0, 512, 320);
  g.fillStyle = `hsl(${hue} 100% 70%)`;
  g.font = 'bold 54px system-ui, sans-serif';
  g.fillText(title, 32, 92);
  g.font = '24px ui-monospace, monospace';
  g.fillStyle = 'rgba(255,255,255,.75)';
  lines.forEach((l, i) => g.fillText(l, 32, 150 + i * 36));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function neonSign(text, color = '#ff4fd8') {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const g = cv.getContext('2d');
  g.font = 'bold 150px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 40;
  g.fillStyle = '#ffe6fb';
  g.fillText(text, 512, 128);
  g.fillText(text, 512, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}

/**
 * Construye la habitación gamer completa y registra sus colisionadores.
 * @param {THREE.Scene} scene
 * @param {import('../physics/Physics.js').Physics} physics
 * @param {{ onLaserCatch?: (n:number) => void }} [hooks]
 */
export async function buildRoom(scene, physics, hooks = {}) {
  const group = new THREE.Group();
  group.name = 'Room';
  scene.add(group);
  const animated = [];        // (t, dt, ctx) => void
  const interactables = [];   // { pos, radius, label, action }

  // ================= estructura =================
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x5a3f33, roughness: 0.85 }); // madera cálida (look indie)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(H * 2, 0.1, H * 2), floorMat);
  floor.position.y = -0.05; floor.receiveShadow = true; group.add(floor);
  const plankMat = new THREE.MeshBasicMaterial({ color: 0x3a281f });
  for (let i = -H + 0.4; i < H; i += 0.4) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.012, H * 2), plankMat);
    p.rotation.x = -Math.PI / 2; p.position.set(i, 0.001, 0); group.add(p);
  }
  physics.addStaticBox(B(-H - 1, -1, -H - 1, H + 1, 0, H + 1));

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2440, roughness: 0.95 });
  const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x241f38, roughness: 0.95 });
  const T = 0.1;
  /** Pared visual + colisionador grueso hacia afuera. */
  const wall = (box, mat = wallMat, colliderOut) => {
    const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), mat);
    m.position.copy(c); m.receiveShadow = true; group.add(m);
    physics.addStaticBox(colliderOut ?? box);
  };
  // fondo e izquierda (enteras)
  wall(B(-H - T, 0, -H - T, H + T, WH, -H), wallMat, B(-H - 1, 0, -H - 1, H + 1, 6, -H));
  wall(B(-H - T, 0, -H, -H, WH, H), wallMat2, B(-H - 1, 0, -H, -H, 6, H));
  // derecha con ventana
  wall(B(H, 0, -H, H + T, WH, WIN.z0), wallMat2, B(H, 0, -H, H + 1, 6, WIN.z0));
  wall(B(H, 0, WIN.z1, H + T, WH, H), wallMat2, B(H, 0, WIN.z1, H + 1, 6, H));
  wall(B(H, 0, WIN.z0, H + T, WIN.y0, WIN.z1), wallMat2, B(H, 0, WIN.z0, H + 1, WIN.y0, WIN.z1));
  wall(B(H, WIN.y1, WIN.z0, H + T, WH, WIN.z1), wallMat2, B(H, WIN.y1, WIN.z0, H + 1, 6, WIN.z1));
  physics.addStaticBox(B(H - 0.02, WIN.y0, WIN.z0, H + 1, WIN.y1, WIN.z1)); // vidrio invisible
  // frente con puerta
  wall(B(-H, 0, H, DOOR.x0, WH, H + T), wallMat, B(-H - 1, 0, H, DOOR.x0, 6, H + 1));
  wall(B(DOOR.x1, 0, H, H + T, WH, H + T), wallMat, B(DOOR.x1, 0, H, H + 1, 6, H + 1));
  wall(B(DOOR.x0, DOOR.y1, H, DOOR.x1, WH, H + T), wallMat, B(DOOR.x0, DOOR.y1, H, DOOR.x1, 6, H + 1));
  physics.addStaticBox(B(DOOR.x0, 0, H - 0.04, DOOR.x1, DOOR.y1, H + 1)); // puerta cerrada
  // techo
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), new THREE.MeshStandardMaterial({ color: 0x1c1830, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = WH; group.add(ceil);
  // zócalos
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1b1729 });
  for (const [w, d, x, z] of [[H * 2, 0.02, 0, -H + 0.01], [0.02, H * 2, -H + 0.01, 0], [0.02, H * 2, H - 0.01, 0], [H * 2, 0.02, 0, H - 0.01]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), baseMat); b.position.set(x, 0.04, z); group.add(b);
  }

  // ventana: marco, repisa (se puede saltar a ella), vista de ciudad
  {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xece4ff, roughness: 0.6 });
    const fw = 0.05;
    const bars = [
      B(H - 0.06, WIN.y0, WIN.z0, H, WIN.y0 + fw, WIN.z1), B(H - 0.06, WIN.y1 - fw, WIN.z0, H, WIN.y1, WIN.z1),
      B(H - 0.06, WIN.y0, WIN.z0, H, WIN.y1, WIN.z0 + fw), B(H - 0.06, WIN.y0, WIN.z1 - fw, H, WIN.y1, WIN.z1),
      B(H - 0.05, WIN.y0, (WIN.z0 + WIN.z1) / 2 - 0.02, H, WIN.y1, (WIN.z0 + WIN.z1) / 2 + 0.02),
    ];
    for (const b of bars) {
      const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), frameMat); m.position.copy(c); group.add(m);
    }
    const sill = B(H - 0.26, WIN.y0 - 0.04, WIN.z0 - 0.06, H, WIN.y0, WIN.z1 + 0.06);
    const s = sill.getSize(new THREE.Vector3()), c = sill.getCenter(new THREE.Vector3());
    const sm = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), frameMat); sm.position.copy(c); sm.castShadow = true; group.add(sm);
    physics.addStaticBox(sill);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.08, depthWrite: false }));
    glass.rotation.y = -Math.PI / 2; glass.position.set(H - 0.02, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2); group.add(glass);
    const sky = citySkyline(6, 3);
    sky.rotation.y = -Math.PI / 2; sky.position.set(H + 1.6, 1.4, (WIN.z0 + WIN.z1) / 2); group.add(sky);
    const moon = new THREE.PointLight(0x9fb8ff, 1.6, 4, 1.5); moon.position.set(H - 0.4, 1.6, -0.7); group.add(moon);
  }

  // ================= paneles acústicos =================
  const hexGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 6);
  hexGeo.rotateX(Math.PI / 2);
  const hexColors = [0x3d2f63, 0x50307a, 0x2c3b6e, 0x452a5c];
  const hexPos = [];
  // wall: 'back' (z=-H, u=x) · 'left' (x=-H, u=z) · 'right' (x=H, u=z)
  const addHexWall = (u0, u1, y0, y1, wallId) => {
    let row = 0;
    for (let y = y0; y <= y1; y += 0.28, row++) {
      for (let u = u0 + (row % 2) * 0.16; u <= u1; u += 0.32) {
        if (Math.random() < 0.18) continue;
        hexPos.push({ u, y, wallId });
      }
    }
  };
  // paneles LED hexagonales (tipo Nanoleaf): marco oscuro + cara luminosa con ola de color
  addHexWall(-2.8, -0.7, 1.6, 2.35, 'back');
  addHexWall(0.6, 1.4, 1.95, 2.35, 'right');
  const hexes = new THREE.InstancedMesh(hexGeo, new THREE.MeshStandardMaterial({ color: 0x1a1626, roughness: 0.8 }), hexPos.length);
  const faceGeo = new THREE.CircleGeometry(0.135, 6);
  faceGeo.rotateZ(Math.PI / 6); // alinear con el hexágono del marco
  const faces = new THREE.InstancedMesh(faceGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), hexPos.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  hexPos.forEach((h, i) => {
    const rotY = h.wallId === 'back' ? 0 : h.wallId === 'left' ? Math.PI / 2 : -Math.PI / 2;
    e.set(0, rotY, Math.PI / 6); q.setFromEuler(e);
    const pos = h.wallId === 'back' ? new THREE.Vector3(h.u, h.y, -H + 0.02)
      : h.wallId === 'left' ? new THREE.Vector3(-H + 0.02, h.y, h.u) : new THREE.Vector3(H - 0.02, h.y, h.u);
    m4.compose(pos, q, new THREE.Vector3(1, 1, 1));
    hexes.setMatrixAt(i, m4);
    const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, rotY, 0));
    m4.compose(pos.clone().addScaledVector(n, 0.022), q, new THREE.Vector3(1, 1, 1));
    faces.setMatrixAt(i, m4);
    faces.setColorAt(i, new THREE.Color(hexColors[i % hexColors.length]));
  });
  group.add(hexes, faces);
  const hexLight = new THREE.PointLight(0xff4fd8, 2.2, 3.2, 1.6); hexLight.position.set(-1.75, 1.95, -2.5); group.add(hexLight);
  const hc = new THREE.Color(), avg = new THREE.Color();
  animated.push((t, dt, ctx) => {
    const beat = ctx?.musicLevels?.[1] ?? 0;
    avg.setRGB(0, 0, 0);
    hexPos.forEach((h, i) => {
      // ola de color que recorre los paneles; con música, laten al ritmo
      const hue = (t * 0.06 + h.u * 0.08 + h.y * 0.12) % 1;
      hc.setHSL(hue, 0.85, 0.45 + Math.sin(t * 1.5 + h.u * 2) * 0.08 + beat * 0.25);
      faces.setColorAt(i, hc);
      if (h.wallId === 'back') avg.add(hc);
    });
    faces.instanceColor.needsUpdate = true;
    hexLight.color.copy(avg.multiplyScalar(1 / Math.max(1, hexPos.length))).multiplyScalar(2.2);
  });

  // ================= tiras LED =================
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff4fd8 });
  const ledBox = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ledMat); m.position.set(x, y, z); group.add(m); };
  ledBox(H * 2, 0.025, 0.025, 0, WH - 0.05, -H + 0.02);
  ledBox(0.025, 0.025, H * 2, -H + 0.02, WH - 0.05, 0);
  ledBox(0.025, 0.025, H * 2, H - 0.02, WH - 0.05, 0);
  ledBox(H * 2, 0.025, 0.025, 0, WH - 0.05, H - 0.02);
  ledBox(2.8, 0.02, 0.02, -1.55, 0.7, -2.2);
  const ledLight = new THREE.PointLight(0xff4fd8, 2, 5, 1.8); ledLight.position.set(-1.2, 2.2, -2.2); group.add(ledLight);
  const ledLight2 = new THREE.PointLight(0x38e1ff, 1.6, 5, 1.8); ledLight2.position.set(1.6, 2.1, 1.6); group.add(ledLight2);
  animated.push((t) => {
    ledMat.color.setHSL((t * 0.05) % 1, 1, 0.6);
    ledLight.color.copy(ledMat.color);
  });

  // letrero neón sobre la TV
  const sign = neonSign('< miau />');
  sign.scale.setScalar(0.8);
  sign.position.set(1.1, 2.05, H - 0.03); sign.rotation.y = Math.PI; group.add(sign);
  const posters = [
    [poster('GG', 'good game, miau', 300, 250, 0.42, 0.58), H - 0.015, 1.55, 1.75, -Math.PI / 2],
    [poster('P1', 'press start', 190, 260, 0.42, 0.58), H - 0.015, 1.55, 2.3, -Math.PI / 2],
    [poster('404', 'croquetas not found', 30, 330, 0.4, 0.55), 2.15, 1.75, H - 0.015, Math.PI],
    [poster('indie', 'hecho a mano', 150, 40, 0.42, 0.58), -H + 0.015, 1.55, -2.2, Math.PI / 2],
  ];
  for (const [m, x, y, z, ry] of posters) { m.position.set(x, y, z); m.rotation.y = ry; group.add(m); }

  // toques indie: guirnaldas de foquitos cálidos y plantas colgantes
  for (const [a, b, n, sag] of [
    [new THREE.Vector3(-H + 0.05, 2.25, -0.3), new THREE.Vector3(-H + 0.05, 2.25, 2.0), 16, 0.22],   // sobre la cama
    [new THREE.Vector3(-2.9, 2.45, -H + 0.05), new THREE.Vector3(2.9, 2.45, -H + 0.05), 30, 0.25],   // fondo
    [new THREE.Vector3(H - 0.05, 2.4, -2.9), new THREE.Vector3(H - 0.05, 2.4, 2.9), 26, 0.3],         // derecha
  ]) {
    const sl = stringLights(a, b, { count: n, sag });
    group.add(sl.object); animated.push(sl.update);
  }
  const warm = new THREE.PointLight(0xffb36b, 1.4, 3.5, 1.6); warm.position.set(-2.4, 1.9, 0.9); group.add(warm);

  // ================= muebles con modelos =================
  const add = async (path, opts, { collide = true, collider } = {}) => {
    const obj = await loadModel(path);
    const box = place(obj, opts);
    group.add(obj);
    if (collider) physics.addStaticBox(collider(box));
    else if (collide === 'mesh') physics.addStaticTrimesh(obj); // forma real (sofá, cama, sillas…)
    else if (collide) physics.addStaticBox(box);
    return { obj, box };
  };
  const MESH = { collide: 'mesh' };
  const tint = (obj, color) => obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(color)); } });

  // --- zona escritorio (pared del fondo) ---
  const deskTop = 0.384 * K;
  await add('furniture/desk.glb', { scale: K, x: -2.98, alignX: 'min', z: -2.98, alignZ: 'min' }, MESH);
  await add('furniture/desk.glb', { scale: K, x: -0.12, alignX: 'max', z: -2.98, alignZ: 'min' }, MESH);
  const screens = [
    { x: -2.35, rot: 0.35, title: 'Proyectos', lines: ['> app-01', '> app-02', '> app-03'], hue: 300 },
    { x: -1.55, rot: 0, title: 'Hola', lines: ['Soy dev.', 'Explora con el gato', 'E · cabezazo'], hue: 190 },
    { x: -0.75, rot: -0.35, title: 'Skills', lines: ['three.js', 'webgl', 'rapier'], hue: 140 },
  ];
  for (const s of screens) {
    const { box } = await add('props/monitor.glb', { scale: K * 0.85, x: s.x, z: -2.72, y: deskTop, rotY: s.rot });
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshBasicMaterial({ map: screenTexture(s.title, s.lines, s.hue) }));
    plane.position.set(center.x, box.min.y + size.y * 0.6, center.z);
    plane.rotation.y = s.rot; plane.translateZ(0.06);
    group.add(plane);
  }
  const glow = new THREE.PointLight(0x7fd8ff, 2.2, 3, 1.5); glow.position.set(-1.55, 1.1, -2.1); group.add(glow);
  await add('props/keyboard.glb', { scale: K, x: -1.55, z: -2.42, y: deskTop });
  await add('props/mouse.glb', { scale: K, x: -1.05, z: -2.42, y: deskTop });
  await add('props/laptop.glb', { scale: K * 0.9, x: -2.7, z: -2.5, y: deskTop, rotY: 0.4 });
  await add('props/speaker-small.glb', { scale: K * 0.8, x: -0.3, z: -2.85, y: deskTop });
  const chair = await add('furniture/chair-desk.glb', { scale: K, x: -1.55, z: -1.75, rotY: Math.PI }, MESH);
  tint(chair.obj, 0xff9ad8);
  await add('props/pc-tower.glb', { height: 0.55, x: 0.45, z: -2.97, alignZ: 'min' });
  await add('props/trashcan.glb', { scale: K * 0.8, x: 0.05, z: -2.05 });

  // ruta de escalada: escritorio → repisa 1 → repisa 2 → librero → repisa alta
  const shelf = (path, x, top) => add(path, { scale: 0.6, x, z: -2.99, alignZ: 'min', y: top - 0.24 });
  await shelf('furniture/shelf-small.glb', -0.25, 1.22);
  await shelf('furniture/shelf-small.glb', 0.4, 1.62);
  await add('furniture/bookcase.glb', { scale: K, x: 1.2, z: -2.98, alignZ: 'min' }, MESH);
  await add('furniture/shelf-decorated.glb', { scale: 0.6, x: 2.0, z: -2.99, alignZ: 'min', y: 2.12 - 0.24 });
  await add('furniture/speaker.glb', { scale: K * 0.8, x: 2.05, z: -2.9 });
  await add('furniture/lamp-floor.glb', { scale: K, x: 2.72, z: -2.3 }, MESH);

  // --- zona descanso (pared izquierda): cama, librero bajo con pecera ---
  const bed = await add('furniture/bed.glb', { scale: K, x: -2.98, alignX: 'min', z: 0.85 }, MESH);
  const low = await add('furniture/bookcase-low.glb', { scale: K, x: -2.98, alignX: 'min', z: -1.3, rotY: Math.PI / 2 }, MESH);
  const tank = fishTank({ x: (low.box.min.x + low.box.max.x) / 2, z: -1.3, y: low.box.max.y, rotY: Math.PI / 2 });
  group.add(tank.object); animated.push(tank.update);
  physics.addStaticBox(B(low.box.min.x + 0.05, low.box.max.y, -1.3 - 0.35, low.box.max.x - 0.05, low.box.max.y + 0.45, -1.3 + 0.35));

  // --- zona sala (frente): TV, sofá, mini nevera ---
  const tvCab = await add('furniture/tv-cabinet.glb', { scale: K, x: 1.1, z: 2.98, alignZ: 'max', rotY: Math.PI }, MESH);
  const tv = await add('props/tv.glb', { scale: K * 0.9, x: 1.1, z: 2.9, alignZ: 'max', y: tvCab.box.max.y, rotY: Math.PI });
  {
    // pantalla de la TV: "partida" en pausa
    const s = tv.box.getSize(new THREE.Vector3()), c = tv.box.getCenter(new THREE.Vector3());
    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(s.x * 0.86, s.y * 0.72), new THREE.MeshBasicMaterial({ map: screenTexture('PAUSA', ['Nivel 3: el sofá', 'Guardado: 99%'], 40) }));
    tvScreen.position.set(c.x, c.y + s.y * 0.04, tv.box.min.z - 0.005); tvScreen.rotation.y = Math.PI; group.add(tvScreen);
  }
  const sofa = await add('furniture/sofa.glb', { scale: K, x: 1.1, z: 1.35 }, MESH);
  tint(sofa.obj, 0x9a7cff);
  await add('furniture/ottoman.glb', { scale: K, x: 1.1, z: 2.1 }, MESH);
  await add('furniture/mini-fridge.glb', { scale: K * 0.9, x: 2.05, z: 2.98, alignZ: 'max', rotY: Math.PI });
  await add('furniture/coat-rack.glb', { scale: K, x: -0.25, z: 2.72 }, MESH);
  await add('structure/doorway.glb', { scale: K, x: (DOOR.x0 + DOOR.x1) / 2, z: H, rotY: Math.PI }, { collide: false });
  {
    const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR.x1 - DOOR.x0 - 0.06, DOOR.y1 - 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0x5b3a6e, roughness: 0.7 }));
    door.position.set((DOOR.x0 + DOOR.x1) / 2, DOOR.y1 / 2, H + 0.02); group.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.8, roughness: 0.3 }));
    knob.position.set(DOOR.x1 - 0.12, 1.0, H - 0.01); group.add(knob);
  }
  const rug = await add('furniture/rug-round.glb', { scale: K * 1.4, x: 0.45, z: -0.35 }, { collide: false });
  rug.obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(0x8a5cc8)); o.castShadow = false; } });
  await add('furniture/plant.glb', { scale: K, x: 2.6, z: 0.35 }, MESH);
  await add('furniture/plant.glb', { scale: K * 0.8, x: -0.85, z: 2.7 }, MESH);

  // ventilador de techo girando
  const fan = await add('furniture/ceiling-fan.glb', { scale: K, x: 0.4, z: 0.2, y: WH - 0.134 * K }, { collide: false });
  {
    const c = fan.box.getCenter(new THREE.Vector3());
    const pivot = new THREE.Group(); pivot.position.set(c.x, 0, c.z); group.add(pivot);
    fan.obj.position.x -= c.x; fan.obj.position.z -= c.z; pivot.add(fan.obj);
    animated.push((t, dt) => { pivot.rotation.y += dt * 2.2; });
  }

  // ================= objetos especiales =================
  const tower = catTower({ x: 2.5, z: -0.7 });
  group.add(tower.object); tower.colliders.forEach((b) => physics.addStaticBox(b)); animated.push(tower.update);

  const cab = arcade({ x: 2.66, z: 1.0, rotY: -Math.PI / 2 });
  group.add(cab.object); cab.object.updateMatrixWorld(true);
  physics.addStaticBox(new THREE.Box3().setFromObject(cab.object.children[0]));
  animated.push(cab.update);
  interactables.push({ pos: new THREE.Vector3(2.2, 0, 1.0), radius: 0.55, label: 'Jugar en el arcade', action: () => { cab.interact(); hooks.onArcade?.(); } });

  // rockola: E abre el menú de música
  const jb = jukebox({ x: 2.72, z: 2.45, rotY: -Math.PI / 2 });
  group.add(jb.object); jb.colliders.forEach((b) => physics.addStaticBox(b)); animated.push(jb.update);
  interactables.push({ pos: new THREE.Vector3(2.25, 0, 2.45), radius: 0.5, label: 'Elegir música', action: () => hooks.onJukebox?.() });

  // plantas colgantes en repisas
  for (const p of [{ x: -0.05, y: 1.22, z: -2.85 }, { x: 2.25, y: 2.12, z: -2.85 }, { x: 1.0, y: 1.72, z: -2.82, length: 0.7 }]) {
    const hp = hangingPlant(p); group.add(hp.object); animated.push(hp.update);
  }

  const litter = litterBox({ x: -2.5, z: 2.55, rotY: Math.PI / 2 });
  group.add(litter.object); litter.colliders.forEach((b) => physics.addStaticBox(b)); animated.push(litter.update);

  const laser = laserPointer({ area: B(-0.8, 0, -1.5, 2.0, 0, 0.7) });
  group.add(laser.object);
  animated.push((t, dt, ctx) => laser.update(t, dt, { ...ctx, onCatch: hooks.onLaserCatch }));

  // ================= objetos dinámicos =================
  const dynamic = async (path, opts, physOpts) => {
    const obj = await loadModel(path);
    place(obj, opts);
    const { pivot, half } = pivotAtCenter(obj, group);
    physics.addDynamicBox(pivot, half, physOpts);
    return pivot;
  };
  await dynamic('props/mug.glb', { height: 0.11, x: -0.55, z: -2.4, y: deskTop + 0.002 }, { density: 0.8 });
  await dynamic('props/books.glb', { scale: K, x: -0.3, z: -2.55, y: deskTop + 0.002, rotY: 0.3 });
  await dynamic('props/controller.glb', { maxSize: 0.16, x: -2.05, z: -2.4, y: deskTop + 0.002, rotY: -0.5 });
  await dynamic('props/headphones.glb', { maxSize: 0.2, x: -2.75, z: -2.85, y: deskTop + 0.002 });
  await dynamic('props/books.glb', { scale: K, x: 1.35, z: -2.75, y: 1.72 + 0.002, rotY: -0.2 });
  await dynamic('props/cardboard-box-closed.glb', { scale: K, x: -2.72, z: -0.58 }, { density: 0.15 });
  await dynamic('props/teddy-bear.glb', { scale: K * 0.8, x: -2.45, z: 1.5, y: bed.box.max.y - 0.12, rotY: Math.PI / 2 }, { density: 0.2 });
  await dynamic('props/pillow.glb', { scale: K, x: -2.65, z: 1.75, y: bed.box.max.y - 0.12, rotY: Math.PI / 2 }, { density: 0.1 });
  await dynamic('props/controller.glb', { maxSize: 0.16, x: 1.1, z: 1.35, y: 0.5, rotY: 0.7 });
  // estambres que ruedan
  for (const [color, x, z] of [[0xff4fd8, 0.9, 0.5], [0x38e1ff, -0.4, 0.9], [0xffd23f, 1.7, -0.6]]) {
    const ball = yarnBall(color);
    ball.position.set(x, 0.08, z); group.add(ball);
    physics.addDynamicBall(ball, 0.07);
  }
  // caja de cartón abierta: el gato cabe dentro (solo colisionan los bordes)
  const boxOpen = await add('props/cardboard-box-open.glb', { scale: K, x: 2.5, z: 1.72, rotY: Math.PI / 2 }, { collide: false });
  physics.addStaticTrimesh(boxOpen.obj); // forma real: el gato puede meterse dentro

  // muebles grandes que pueden tapar la cámara (el brazo de cámara se acerca)
  const occluders = [];
  for (const child of group.children) {
    if (child === floor || child === ceil || child.isInstancedMesh || child.isLight) continue;
    const s = new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
    // solo muebles altos: con la cámara elevada se ve por encima del sofá, la silla o la cama
    if (s.y > 1.1 && Math.max(s.x, s.z) > 0.3 && Math.max(s.x, s.z) < 5) occluders.push(child);
  }

  return {
    group,
    occluders,
    spawn: new THREE.Vector3(0.6, 0.05, -0.2),
    bounds: B(-H + 0.12, 0.15, -H + 0.12, H - 0.12, WH - 0.12, H - 0.12),
    litter: { inner: litter.inner, exitPoint: new THREE.Vector3(-2.0, 0.05, 2.2) },
    interactables,
    get laserCaught() { return laser.caught; },
    update(t, dt, ctx) { animated.forEach((f) => f(t, dt, ctx)); },
  };
}
