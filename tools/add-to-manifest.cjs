// Uso: node inspect.mjs <glbs...> | node add-to-manifest.cjs
// Agrega al manifest los modelos de Kenney nuevos y regenera CREDITS.md
const fs = require('fs');
const path = require('path');
const roles = {
  'teddy-bear': 'Oso de peluche (dinámico)', 'ceiling-fan': 'Ventilador de techo (gira)', tv: 'TV',
  'tv-cabinet': 'Mueble de TV', sofa: 'Sofá', ottoman: 'Puf', 'mini-fridge': 'Mini nevera (bebidas energéticas)',
  doorway: 'Marco de puerta', bed: 'Cama', pillow: 'Cojín (dinámico)', trashcan: 'Bote de basura', 'coat-rack': 'Perchero',
};
const root = path.join(__dirname, '..', 'public', 'models');
const mp = path.join(root, 'manifest.json');
const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
for (const line of fs.readFileSync(0, 'utf8').trim().split(/\r?\n/)) {
  const o = JSON.parse(line);
  const rel = o.file.split(/[\\/]/).join('/').replace(/^.*public\//, '');
  const name = path.basename(rel, '.glb');
  if (m.some((x) => x.file === rel)) continue;
  m.push({ file: rel, role: roles[name] || name, tris: o.tris, materials: o.materials, textures: o.textures, joints: 0, animations: [],
    kb: Math.round(o.size / 1024), author: 'Kenney (kenney.nl)', license: 'CC0 1.0', source: 'https://kenney.nl/assets/furniture-kit' });
  console.log(name, o.tris, 'tris', (o.sizeXYZ || []).join('x'));
}
fs.writeFileSync(mp, JSON.stringify(m, null, 2));
const credits = ['# Créditos de modelos 3D', '', 'Los modelos CC BY 3.0 requieren atribución visible en el sitio.', '',
  '| Archivo | Autor | Licencia | Fuente |', '|---|---|---|---|', ...m.map((x) => `| ${x.file} | ${x.author} | ${x.license} | ${x.source} |`)].join('\n');
fs.writeFileSync(path.join(root, 'CREDITS.md'), credits + '\n');
console.log('total', m.length);
