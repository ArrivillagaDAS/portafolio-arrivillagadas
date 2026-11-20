// Copia los modelos ganadores a public/models como .glb únicos (glTF+bin+png -> glb),
// limpia datos sin uso y genera manifest.json con licencia, fuente y métricas.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';

const DL = '../_downloads';
const OUT = '../public/models';
const KEN = `${DL}/kenney/Models/GLTF format`;
const KAY = `${DL}/kaykit/KayKit-Furniture-Bits-1.0-main/addons/kaykit_furniture_bits/Assets/gltf`;
const PP = `${DL}/pp`;

const CC0 = 'CC0 1.0';
const BY = 'CC BY 3.0';
const kenney = { author: 'Kenney (kenney.nl)', license: CC0, source: 'https://kenney.nl/assets/furniture-kit' };
const kaykit = { author: 'Kay Lousberg (kaylousberg.com)', license: CC0, source: 'https://kaylousberg.itch.io/furniture-bits' };
const pp = (id, author, license) => ({ author, license, source: `https://poly.pizza/m/${id}` });

// [destino, origen, meta, rol]
const items = [
  // --- personaje ---
  ['characters/cat.glb', `${PP}/cat__DJ9rpAhrh3.glb`, pp('DJ9rpAhrh3', 'J-Toastie', BY), 'Gato principal (rig 22 huesos + IdleCat)'],
  ['characters/cat-alt.glb', `${PP}/cat__8GJbfM8R1A.glb`, pp('8GJbfM8R1A', 'J-Toastie', BY), 'Gato alternativo más ligero (rig 24 huesos, sin clips, colores planos)'],
  // --- estructura ---
  ['structure/floor.glb', `${KEN}/floorFull.glb`, kenney, 'Baldosa de suelo 1x1'],
  ['structure/wall.glb', `${KEN}/wall.glb`, kenney, 'Pared'],
  ['structure/wall-window.glb', `${KEN}/wallWindow.glb`, kenney, 'Pared con ventana'],
  ['structure/wall-corner.glb', `${KEN}/wallCorner.glb`, kenney, 'Esquina de pared'],
  // --- muebles estáticos ---
  ['furniture/desk.glb', `${KEN}/desk.glb`, kenney, 'Escritorio recto'],
  ['furniture/desk-corner.glb', `${KEN}/deskCorner.glb`, kenney, 'Escritorio en L (setup gamer amplio)'],
  ['furniture/chair-desk.glb', `${KEN}/chairDesk.glb`, kenney, 'Silla de escritorio con ruedas'],
  ['furniture/bookcase.glb', `${KEN}/bookcaseOpen.glb`, kenney, 'Librero abierto (escalada)'],
  ['furniture/bookcase-low.glb', `${KEN}/bookcaseOpenLow.glb`, kenney, 'Librero bajo (primer escalón)'],
  ['furniture/shelf-small.glb', `${KAY}/shelf_A_small.gltf`, kaykit, 'Repisa flotante pequeña'],
  ['furniture/shelf-big.glb', `${KAY}/shelf_A_big.gltf`, kaykit, 'Repisa flotante grande'],
  ['furniture/shelf-decorated.glb', `${KAY}/shelf_B_small_decorated.gltf`, kaykit, 'Repisa con decoración'],
  ['furniture/rug.glb', `${KEN}/rugRectangle.glb`, kenney, 'Alfombra rectangular'],
  ['furniture/rug-round.glb', `${KEN}/rugRound.glb`, kenney, 'Alfombra redonda'],
  ['furniture/lamp-floor.glb', `${KEN}/lampRoundFloor.glb`, kenney, 'Lámpara de pie'],
  ['furniture/speaker.glb', `${KEN}/speaker.glb`, kenney, 'Parlante de torre'],
  ['furniture/plant.glb', `${KEN}/pottedPlant.glb`, kenney, 'Planta en maceta'],
  // --- interactivos / props ---
  ['props/monitor.glb', `${KEN}/computerScreen.glb`, kenney, 'Monitor (Proyectos)'],
  ['props/pc-tower.glb', `${PP}/pc__5cN7W4ufoII.glb`, pp('5cN7W4ufoII', 'Alex Safayan', BY), 'Torre PC con cristal y ventiladores (Habilidades / Sobre mí)'],
  ['props/mug.glb', `${PP}/mug__54cOZNS04L.glb`, pp('54cOZNS04L', 'MilkAndBanana', CC0), 'Taza (mecánica de zarpazo)'],
  ['props/cardboard-box-open.glb', `${KEN}/cardboardBoxOpen.glb`, kenney, 'Caja abierta (Contacto)'],
  ['props/cardboard-box-closed.glb', `${KEN}/cardboardBoxClosed.glb`, kenney, 'Caja cerrada'],
  ['props/keyboard.glb', `${KEN}/computerKeyboard.glb`, kenney, 'Teclado'],
  ['props/mouse.glb', `${KEN}/computerMouse.glb`, kenney, 'Mouse'],
  ['props/laptop.glb', `${KEN}/laptop.glb`, kenney, 'Laptop'],
  ['props/speaker-small.glb', `${KEN}/speakerSmall.glb`, kenney, 'Parlante de escritorio'],
  ['props/books.glb', `${KEN}/books.glb`, kenney, 'Libros (empujables)'],
  ['props/controller.glb', `${PP}/extra__fCyA3Ug79X.glb`, pp('fCyA3Ug79X', 'Ginsta', BY), 'Mando de consola'],
  ['props/headphones.glb', `${PP}/extra__VLB0kuGDoP.glb`, pp('VLB0kuGDoP', 'Ginsta', BY), 'Audífonos'],
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const tri = (p) => { const i = p.getIndices(), a = p.getAttribute('POSITION'); return p.getMode() === 4 ? (i ? i.getCount() : a.getCount()) / 3 : 0; };
const manifest = [];

for (const [dst, src, meta, role] of items) {
  const doc = await io.read(src);
  await doc.transform(dedup(), prune());
  const out = path.join(OUT, dst);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await io.write(out, doc);

  // verificación: releer el archivo final
  const chk = await io.read(out);
  const r = chk.getRoot();
  let tris = 0;
  for (const n of r.listNodes()) { const m = n.getMesh(); if (m) for (const p of m.listPrimitives()) tris += tri(p); }
  const anims = r.listAnimations().map((a) => a.getName());
  const joints = r.listSkins().reduce((s, k) => s + k.listJoints().length, 0);
  const textures = r.listTextures().map((t) => (t.getSize() || []).join('x'));
  manifest.push({ file: `models/${dst}`, role, tris: Math.round(tris), materials: r.listMaterials().length, textures, joints, animations: anims, kb: Math.round(fs.statSync(out).size / 1024), ...meta });
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const credits = ['# Créditos de modelos 3D', '', 'Generado por tools/pack.mjs. Los modelos CC BY 3.0 requieren atribución visible en el sitio.', '',
  '| Archivo | Autor | Licencia | Fuente |', '|---|---|---|---|',
  ...manifest.map((m) => `| ${m.file} | ${m.author} | ${m.license} | ${m.source} |`)].join('\n');
fs.writeFileSync(path.join(OUT, 'CREDITS.md'), credits + '\n');
console.table(manifest.map(({ file, tris, materials, textures, joints, animations, kb, license }) => ({ file: file.replace('models/', ''), tris, mats: materials, tex: textures.join(','), joints, anims: animations.join(','), kb, license })));
const total = manifest.reduce((s, m) => s + m.tris, 0), kb = manifest.reduce((s, m) => s + m.kb, 0);
console.log(`TOTAL: ${manifest.length} archivos, ${total} triángulos, ${kb} KB`);
