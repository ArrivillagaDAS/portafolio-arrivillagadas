// Uso: node inspect.mjs <archivo|carpeta> [...]  -> imprime JSON por línea
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { inspect as gtInspect } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function walk(p) {
  const st = fs.statSync(p);
  if (st.isFile()) return /\.(glb|gltf)$/i.test(p) ? [p] : [];
  return fs.readdirSync(p).flatMap((f) => walk(path.join(p, f)));
}

function triCount(prim) {
  const idx = prim.getIndices();
  const pos = prim.getAttribute('POSITION');
  const n = idx ? idx.getCount() : pos ? pos.getCount() : 0;
  const mode = prim.getMode();
  if (mode === 4) return n / 3; // TRIANGLES
  if (mode === 5 || mode === 6) return Math.max(0, n - 2);
  return 0;
}

for (const file of process.argv.slice(2).flatMap(walk)) {
  const out = { file: path.relative(process.cwd(), file), size: fs.statSync(file).size };
  try {
    const doc = await io.read(file);
    const root = doc.getRoot();
    let tris = 0, prims = 0;
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { tris += triCount(p); prims++; }
    // instancias: contar nodos que usan cada malla
    let drawTris = 0;
    for (const n of root.listNodes()) { const m = n.getMesh(); if (m) for (const p of m.listPrimitives()) drawTris += triCount(p); }
    const r = gtInspect(doc);
    const sceneBox = r.scenes.properties[0]?.bboxMax && r.scenes.properties[0]?.bboxMin
      ? r.scenes.properties[0].bboxMax.map((v, i) => +(v - r.scenes.properties[0].bboxMin[i]).toFixed(3)) : null;
    Object.assign(out, {
      tris: Math.round(drawTris || tris),
      meshes: root.listMeshes().length,
      nodes: root.listNodes().length,
      primitives: prims,
      materials: root.listMaterials().length,
      textures: root.listTextures().map((t) => { const s = t.getSize(); return s ? `${s[0]}x${s[1]}` : t.getMimeType(); }),
      skins: root.listSkins().length,
      joints: root.listSkins().reduce((a, s) => a + s.listJoints().length, 0),
      animations: root.listAnimations().map((a) => {
        let dur = 0;
        for (const s of a.listSamplers()) { const i = s.getInput(); if (i) dur = Math.max(dur, i.getMax([])[0]); }
        return `${a.getName()} (${dur.toFixed(2)}s)`;
      }),
      sizeXYZ: sceneBox,
      extensions: root.listExtensionsUsed().map((e) => e.extensionName),
    });
  } catch (e) {
    out.error = String(e.message || e);
  }
  console.log(JSON.stringify(out));
}
