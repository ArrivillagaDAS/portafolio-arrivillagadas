import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GamerCat } from './cat/GamerCat.js';
import { createCustomizer } from './ui/customizer.js';
import { createHud } from './ui/hud.js';
import { createCredits } from './ui/credits.js';
import { createZonePanel } from './ui/zonePanel.js';
import { loadLook, saveLook, isCrownUnlocked, unlockCrown } from './state.js';
import { MOTIVATIONS } from './content.js';
import { Physics } from './physics/Physics.js';
import { buildForest } from './world/Forest.js';
import { CatController } from './player/CatController.js';
import { FollowCamera } from './camera/FollowCamera.js';
import { Input } from './input/Input.js';
import './style.css';

const SHOWROOM_CAT_H = 0.7;  // alto del gato en la vitrina
const WORLD_CAT_H = 0.32;    // alto real (m) en el mundo

const canvas = document.getElementById('scene');
const isMobile = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile || devicePixelRatio < 2 });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 120);

// ======================= VITRINA (personalización) =======================
const showroom = new THREE.Scene();
showroom.background = new THREE.Color(0x0f0e15);
showroom.fog = new THREE.Fog(0x0f0e15, 4, 9);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.2;
controls.maxDistance = 3.5;
controls.maxPolarAngle = Math.PI * 0.48;
showroom.add(new THREE.HemisphereLight(0xd8d4ff, 0x2a2040, 1.4));
{
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 4, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.5;
  key.shadow.camera.right = key.shadow.camera.top = 1.5;
  showroom.add(key);
  const rimA = new THREE.PointLight(0xff4fd8, 2.5, 5); rimA.position.set(-1.2, 0.8, -1); showroom.add(rimA);
  const rimB = new THREE.PointLight(0x38e1ff, 2, 5); rimB.position.set(1.2, 0.6, -1.2); showroom.add(rimB);
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x1b1828, roughness: 0.85 }));
  stage.position.y = -0.04; stage.receiveShadow = true; showroom.add(stage);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: 0x14121d, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.08; floor.receiveShadow = true; showroom.add(floor);
}
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff4fd8 }));
ring.rotation.x = Math.PI / 2; ring.position.y = 0.001; showroom.add(ring);

const view = { target: new THREE.Vector3(), camPos: new THREE.Vector3() };
function frameShowroom() {
  if (innerWidth >= 820) { view.target.set(-0.38, 0.32, 0); view.camPos.set(0.9, 0.75, 1.75); }
  else { view.target.set(0, -0.12, 0); view.camPos.set(1.2, 0.85, 2.6); }
}
controls.addEventListener('start', () => { controls.dragging = true; spin = 0; view.camPos.copy(camera.position); });
controls.addEventListener('end', () => { controls.dragging = false; view.camPos.copy(camera.position); });

// ======================= MUNDO ABIERTO =======================
const world = new THREE.Scene();
world.background = new THREE.Color(0xa9dcff);
world.fog = new THREE.Fog(0xa9dcff, 16, 42);
world.add(new THREE.HemisphereLight(0xe6f6ff, 0x4f8a3a, 1.4));
const sun = new THREE.DirectionalLight(0xfff2d6, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
world.add(sun, sun.target);

let forest = null, physics = null, player = null;
const follow = new FollowCamera(camera, canvas);
follow.minD = 3; follow.maxD = 11;
follow.minPitch = 0.55; follow.maxPitch = 1.3; // cámara alta tipo diorama
const input = new Input(document.body);
const hud = createHud(document.getElementById('world'));
const panel = createZonePanel();

async function ensureWorld() {
  if (forest) return;
  physics = await Physics.create();
  forest = buildForest(world, physics, { lowQuality: isMobile });
  if (isCrownUnlocked()) forest.tree.takePrize(); // el cofre ya está abierto si la corona se ganó antes
  player = new CatController(physics, cat, input, { walk: 1.8, run: 4.2 });
}

// ======================= estado general =======================
let mode = 'custom';
let spin = 0.35;

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = mode === 'custom' ? 36 : innerWidth < innerHeight ? 60 : 45;
  camera.updateProjectionMatrix();
  if (mode === 'custom') frameShowroom();
}
resize();
camera.position.copy(view.camPos);
controls.target.copy(view.target);
addEventListener('resize', resize);

const loading = document.getElementById('loading');
const cat = new GamerCat({ height: SHOWROOM_CAT_H });
await cat.load();
showroom.add(cat.root);
const look = loadLook();
cat.applyLook(look);
loading.classList.add('done');

const credits = createCredits({ onClose: () => { if (mode === 'world') input.setEnabled(true); } });
document.getElementById('credits-btn').addEventListener('click', () => { input.setEnabled(false); hud.prompt(null); credits.show(); });

// tocar al gato en la vitrina = saludo
const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (mode !== 'custom' || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  if (ray.intersectObject(cat.root, true).length) cat.react();
});

// ======================= transiciones =======================
const ui = document.getElementById('ui');
const hudEl = document.getElementById('world');

async function enterWorld() {
  customizer.hide();
  loading.textContent = 'Preparando el bosque…';
  loading.classList.remove('done');
  await ensureWorld();
  mode = 'world';
  controls.enabled = false;
  world.add(cat.root);
  cat.root.scale.setScalar(WORLD_CAT_H / SHOWROOM_CAT_H);
  player.spawn(forest.spawn);
  player.yaw = Math.PI; // mirando hacia el nombre
  follow.enabled = true;
  follow.yaw = 0.35; follow.pitch = 0.85; follow.distance = 6.5;
  follow.snap(cat.root.position);
  input.setEnabled(true);
  hudEl.hidden = false;
  canvas.classList.add('grab');
  resize();
  loading.classList.add('done');
  hud.toast('Explora el bosque: cada lugar es una sección', 4200);
}

function backToShowroom() {
  mode = 'custom';
  input.setEnabled(false);
  follow.enabled = false;
  hudEl.hidden = true;
  panel.hide();
  canvas.classList.remove('grab');
  hud.prompt(null);
  showroom.add(cat.root);
  cat.root.scale.setScalar(1);
  cat.root.position.set(0, 0, 0);
  cat.root.rotation.set(0, 0, 0);
  player.override = null; player.frozen = 0;
  cat.play('Idle');
  controls.enabled = true;
  resize();
  customizer.show();
}

const customizer = createCustomizer(ui, {
  look,
  onChange(next) {
    const accessoryAdded = (next.headset && !cat.look.headset) || (next.collar && !cat.look.collar);
    cat.applyLook(next);
    saveLook(next);
    if (accessoryAdded) cat.react();
  },
  onEnter(final) { saveLook(final); enterWorld(); },
  onCredits: () => credits.show(),
});
document.getElementById('edit-cat').addEventListener('click', backToShowroom);
addEventListener('keydown', (e) => { if (mode === 'world' && e.code === 'Escape' && !credits.open) backToShowroom(); });

// ======================= zonas e interacción =======================
function zones() {
  const p = cat.root.position;
  let best = null, bestD = Infinity;
  for (const t of forest.triggers) {
    if (t.maxY !== undefined && p.y > t.maxY) continue;
    const d = Math.hypot(p.x - t.pos.x, p.z - t.pos.z);
    if (d < t.radius && d < bestD) { best = t; bestD = d; }
  }
  if (best) panel.show(best.zone, best.data); else panel.hide();

  // laberinto: dentro no se puede saltar
  const inMaze = forest.maze.bounds.containsPoint(p);
  player.canJump = !inMaze;
  if (inMaze !== water.inMaze) { water.inMaze = inMaze; hud.setFish(inMaze ? forest.maze : null); }

  // agua: el gato puede entrar, pero no le gusta
  const lk = forest.lake;
  const wet = Math.hypot(p.x - lk.x, p.z - lk.z) < lk.radius - 0.15 && p.y < 0.3;
  ctx.inWater = wet;
  if (wet && !water.in) {
    water.in = true; water.time = 0;
    player.hopQueued = true; // brinco de susto al tocar el agua
    hud.toast(WATER_LINES[Math.floor(Math.random() * WATER_LINES.length)], 1800);
  } else if (!wet && water.in) {
    water.in = false; water.shake = 0.9; // se sacude al salir
    hud.toast('Brr... sacudida de gato', 1400);
  }
  if (water.in) {
    water.time += 1 / 60;
    player.speedMul = 0.45;
    if (water.time > 1.2 && Math.random() < 0.012) player.hopQueued = true; // salta de vez en cuando, incómodo
  } else player.speedMul = 1;

  // premio en la casa del árbol
  const prize = forest.tree.prize;
  if (!prize.taken && Math.hypot(p.x - prize.pos.x, p.z - prize.pos.z) < 0.75 && Math.abs(p.y - prize.pos.y) < 0.5) {
    forest.tree.takePrize();
    unlockCrown();
    const next = { ...cat.look, crown: true };
    cat.applyLook(next); saveLook(next); customizer.sync(next);
    player.perform('Headbutt', 0.5);
    hud.confetti();
    hud.toast('¡Corona desbloqueada! Ya la puedes usar en "Editar gato"', 4200);
  }

  if (!input.consumeAction() || player.frozen > 0) return;
  // cabezazo: empuja lo que haya delante (letras, latas, estambres)
  player.perform('Headbutt', 0.45);
  setTimeout(() => {
    const dir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const n = physics.pushNear(player.frontPoint(0.22), dir, { radius: 0.4, strength: 3.2, lift: 0.4 });
    if (n) hud.toast(n > 1 ? `¡${n} cosas por los aires!` : '¡Pum!', 1200);
  }, 200);
}

const WATER_LINES = ['¡Agua! ¡Agua fría!', 'A los gatos no les gusta mojarse...', '¡Miau! ¿Quién puso agua aquí?'];
const water = { in: false, time: 0, shake: 0 };

// acceso de depuración solo en desarrollo
if (import.meta.env.DEV) window.__game = { get follow() { return follow; }, get player() { return player; }, get forest() { return forest; }, get physics() { return physics; }, camera, cat, renderer, world };

// ======================= bucle =======================
const clock = new THREE.Clock();
const ctx = {
  catPos: new THREE.Vector3(), cameraPos: camera.position, inWater: false,
  onFish: (n, total, idx) => hud.quote(MOTIVATIONS[idx % MOTIVATIONS.length], n, total),
  onStep: (n, total) => { if (n === total) hud.toast('¡Último escalón! Sube a la casa', 1600); else if (n % 5 === 0) hud.toast(`Escalón ${n} de ${total}`, 1100); },
};
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  renderer.toneMapping = mode === 'world' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;

  if (mode === 'custom') {
    cat.update(dt, t);
    cat.root.rotation.y += spin * dt;
    ring.material.color.setHSL((t * 0.08) % 1, 1, 0.55);
    const k = 1 - Math.exp(-dt * 3);
    controls.target.lerp(view.target, k);
    if (!controls.dragging && camera.position.distanceTo(view.camPos) > 0.01) camera.position.lerp(view.camPos, k * 0.6);
    controls.update();
    renderer.render(showroom, camera);
    return;
  }

  player.camYaw = follow.yaw;
  physics.step(dt, (h) => player.fixedStep(h));
  player.update(dt, physics.acc / (1 / 60));
  cat.update(dt, t);
  ctx.catPos.copy(cat.root.position);
  forest.update(t, dt, ctx);
  zones();
  // en el agua el gato se hunde un poco; al salir se sacude
  if (water.in) cat.root.position.y -= 0.05;
  if (water.shake > 0) { water.shake -= dt; cat.model.rotation.z = Math.sin(water.shake * 40) * 0.25 * water.shake; } else cat.model.rotation.z = 0;
  // la sombra del sol sigue al gato (sombras nítidas sin un mapa gigante)
  const c = cat.root.position;
  sun.position.set(c.x + 6, 12, c.z + 8);
  sun.target.position.copy(c);
  follow.update(dt, c);
  renderer.render(world, camera);
});
