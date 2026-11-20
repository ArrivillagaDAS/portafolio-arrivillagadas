import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();

/** Carga (con caché) y devuelve una copia lista para colocar. */
export async function loadModel(path) {
  if (!cache.has(path)) cache.set(path, loader.loadAsync(`${import.meta.env.BASE_URL}models/${path}`).then((g) => g.scene));
  const src = await cache.get(path);
  const obj = src.clone(true);
  const lights = [];
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    if (o.isLight) lights.push(o); // algunos .glb traen luces propias (p. ej. la lámpara): las controlamos nosotros
  });
  lights.forEach((l) => l.removeFromParent());
  return obj;
}

/**
 * Escala, rota y coloca un modelo apoyado en `y` con el centro de su base en (x, z).
 * @param {THREE.Object3D} obj
 * @param {{ x?: number, y?: number, z?: number, rotY?: number, scale?: number, height?: number, maxSize?: number,
 *           alignX?: 'min'|'max'|'center', alignZ?: 'min'|'max'|'center' }} o
 *   scale: factor directo · height: alto final en metros · maxSize: dimensión mayor final
 *   alignX/alignZ: qué borde de la caja se pone en x/z (útil para pegar a paredes)
 */
export function place(obj, o = {}) {
  obj.rotation.y = o.rotY ?? 0;
  obj.scale.setScalar(1);
  obj.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  let s = o.scale ?? 1;
  if (o.height) s = o.height / size.y;
  if (o.maxSize) s = o.maxSize / Math.max(size.x, size.y, size.z);
  obj.scale.setScalar(s);
  obj.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(obj);

  const ref = (axis, align) => (align === 'min' ? box.min[axis] : align === 'max' ? box.max[axis] : (box.min[axis] + box.max[axis]) / 2);
  obj.position.x += (o.x ?? 0) - ref('x', o.alignX);
  obj.position.z += (o.z ?? 0) - ref('z', o.alignZ);
  obj.position.y += (o.y ?? 0) - box.min.y;
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

/** Envuelve un objeto ya colocado en un pivote centrado en su caja (para cuerpos dinámicos). */
export function pivotAtCenter(obj, parent) {
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const pivot = new THREE.Group();
  pivot.position.copy(c);
  obj.position.sub(c);
  pivot.add(obj);
  parent.add(pivot);
  return { pivot, half };
}
