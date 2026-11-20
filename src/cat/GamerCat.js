import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FURS } from './palettes.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models/characters/cat.glb`;

/**
 * Gato jugable: carga el modelo de Quaternius, tiñe su pelaje y le añade
 * accesorios gamer hechos con primitivas, pegados al hueso de la cabeza.
 */
export class GamerCat {
  /** @param {{ height?: number }} [opts] altura final en unidades del mundo */
  constructor({ height = 0.7 } = {}) {
    this.height = height;
    this.root = new THREE.Group();
    this.root.name = 'GamerCat';
    this.rgbMaterials = [];
    this.actions = new Map();
    this.current = null;
    this.look = null;
  }

  async load() {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = this.height / size.y;
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    this.root.add(model);
    this.model = model;

    model.traverse((o) => {
      if (o.isMesh) { this.mesh = o; o.castShadow = true; }
      if (o.isBone && o.name === 'Head') this.head = o;
      if (o.isBone && o.name === 'Body') this.body = o;
    });

    this.#setupFur();
    this.#buildAccessories();

    this.clips = gltf.animations; // para clonar el gato (minijuego del arcade)
    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) {
      const name = clip.name.split('|').pop();
      const action = this.mixer.clipAction(clip);
      if (['Death', 'Jump_Start', 'Headbutt'].includes(name)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(name, action);
    }
    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.actions.get('Headbutt') && this.returnTo) this.play(this.returnTo);
    });
    this.play('Idle');
    return this;
  }

  /** Cambia de clip con fundido. Nombres: Idle, Walk, Run, Jump_Start, Jump_Loop, Headbutt, Idle_Eating, Death */
  play(name, fade = 0.25) {
    const next = this.actions.get(name);
    if (!next || next === this.current) return;
    next.reset().setEffectiveWeight(1).play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
  }

  /** Reacción corta (cabezazo) y vuelta al clip anterior. */
  react() {
    const prevName = [...this.actions].find(([, a]) => a === this.current)?.[0] ?? 'Idle';
    this.returnTo = prevName === 'Headbutt' ? 'Idle' : prevName;
    const hb = this.actions.get('Headbutt');
    const prev = this.current;
    hb.reset().setEffectiveWeight(1).play();
    if (prev && prev !== hb) prev.crossFadeTo(hb, 0.12, false);
    this.current = hb;
  }

  /** @param {{ fur: string, headset: boolean, collar: boolean }} look */
  applyLook(look) {
    this.look = { ...look };
    const fur = FURS.find((f) => f.id === look.fur) ?? FURS[0];
    this.#recolor(fur.main, fur.dark);
    this.headset.visible = !!look.headset;
    this.collar.visible = !!look.collar;
  }

  update(dt, t) {
    this.mixer?.update(dt);
    this.rgbMaterials.forEach((m, i) => m.color.setHSL((t * 0.15 + i * 0.13) % 1, 1, 0.6));
  }

  // --- pelaje: tiñe solo los píxeles grises del atlas, respeta ojos y nariz ---
  #setupFur() {
    const src = this.mesh.material;
    const img = src.map.image;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    this.ctx = cv.getContext('2d', { willReadFrequently: true });
    this.ctx.drawImage(img, 0, 0);
    this.baseImage = this.ctx.getImageData(0, 0, cv.width, cv.height);

    const tex = new THREE.CanvasTexture(cv);
    tex.flipY = src.map.flipY;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = src.map.magFilter;
    tex.minFilter = src.map.minFilter;
    this.furTexture = tex;

    const mat = src.clone();
    mat.map = tex;
    this.mesh.material = mat;
  }

  #recolor(main, dark) {
    const out = this.ctx.createImageData(this.baseImage);
    const a = this.baseImage.data, b = out.data;
    const F = new THREE.Color(main), D = new THREE.Color(dark), c = new THREE.Color();
    for (let i = 0; i < a.length; i += 4) {
      const r = a[i], g = a[i + 1], bl = a[i + 2];
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
      if (mx - mn < 18 && mx > 40 && mx < 240) {
        const t = Math.min(1, Math.max(0, (mx - 40) / 90));
        c.copy(D).lerp(F, t);
        b[i] = c.r * 255; b[i + 1] = c.g * 255; b[i + 2] = c.b * 255;
      } else { b[i] = r; b[i + 1] = g; b[i + 2] = bl; }
      b[i + 3] = a[i + 3];
    }
    this.ctx.putImageData(out, 0, 0);
    this.furTexture.needsUpdate = true;
  }

  // --- accesorios con primitivas ---
  #neon(hue) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 1, 0.6) });
    this.rgbMaterials.push(m);
    return m;
  }

  #buildAccessories() {
    this.root.updateMatrixWorld(true);
    const headPos = this.head.getWorldPosition(new THREE.Vector3());
    const bodyPos = this.body.getWorldPosition(new THREE.Vector3());
    const forward = headPos.clone().sub(bodyPos).setY(0).normalize();

    // caja de la cabeza a partir de los vértices que mueve el hueso Head
    const headBox = new THREE.Box3();
    const geo = this.mesh.geometry;
    const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
    const hi = this.mesh.skeleton.bones.indexOf(this.head);
    const v = new THREE.Vector3();
    for (let i = 0; i < geo.attributes.position.count; i++) {
      if (si.getX(i) === hi && sw.getX(i) > 0.5) {
        this.mesh.getVertexPosition(i, v);
        headBox.expandByPoint(v.applyMatrix4(this.mesh.matrixWorld));
      }
    }
    const raw = headBox.getSize(new THREE.Vector3());
    const hc = headBox.getCenter(new THREE.Vector3());
    const alongX = Math.abs(forward.x) > Math.abs(forward.z);
    const hs = new THREE.Vector3(alongX ? raw.z : raw.x, raw.y, alongX ? raw.x : raw.z); // ancho, alto, largo

    const shell = new THREE.MeshStandardMaterial({ color: 0x1c1a26, roughness: 0.4, metalness: 0.3 });

    // audífonos: arco sobre la cabeza + copas con aro LED + micrófono
    const headset = new THREE.Group();
    headset.name = 'Headset';
    const w = hs.x * 0.5 + 0.008, cupR = hs.y * 0.17;
    const band = new THREE.Mesh(new THREE.TorusGeometry(w, hs.y * 0.04, 8, 32, Math.PI), shell);
    band.position.y = hs.y * 0.02;
    headset.add(band);
    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(cupR, cupR, hs.x * 0.1, 20), shell);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * w, 0, 0);
      headset.add(cup);
      const led = new THREE.Mesh(new THREE.TorusGeometry(cupR * 0.72, cupR * 0.15, 6, 24), this.#neon(side > 0 ? 0.85 : 0.5));
      led.rotation.y = Math.PI / 2;
      led.position.set(side * (w + hs.x * 0.052), 0, 0);
      headset.add(led);
    }
    const micLen = hs.z * 0.42;
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(hs.y * 0.018, hs.y * 0.018, micLen, 6), shell);
    mic.rotation.x = Math.PI / 2;
    mic.position.set(-w, -hs.y * 0.14, micLen / 2);
    headset.add(mic);
    const micTip = new THREE.Mesh(new THREE.SphereGeometry(hs.y * 0.045, 10, 8), this.#neon(0.3));
    micTip.position.set(-w, -hs.y * 0.14, micLen);
    headset.add(micTip);

    // collar LED en la base de la cabeza, con placa
    const collar = new THREE.Group();
    collar.name = 'Collar';
    const r = hs.x * 0.3;
    collar.add(new THREE.Mesh(new THREE.TorusGeometry(r, hs.y * 0.04, 8, 32), this.#neon(0.55)));
    const tag = new THREE.Mesh(new THREE.OctahedronGeometry(hs.y * 0.07), this.#neon(0.15));
    tag.position.set(0, -r - hs.y * 0.05, hs.y * 0.03);
    collar.add(tag);

    // se arman en espacio mundo (Z local = mirada) y head.attach conserva la transformación
    const mount = (group, pos) => {
      group.position.copy(pos);
      group.lookAt(pos.clone().add(forward));
      this.root.add(group);
      group.updateMatrixWorld(true);
      this.head.attach(group);
    };
    mount(headset, new THREE.Vector3(hc.x, hc.y + hs.y * 0.2, hc.z).addScaledVector(forward, hs.z * 0.05));
    mount(collar, new THREE.Vector3(hc.x, hc.y - hs.y * 0.24, hc.z).addScaledVector(forward, -hs.z * 0.52));

    this.headset = headset;
    this.collar = collar;
  }
}
