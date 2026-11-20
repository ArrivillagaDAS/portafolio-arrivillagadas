// Vegetación del bosque: pasto con viento, arbustos redondos, flores y mariposas.
import * as THREE from 'three';

/**
 * Pasto denso: miles de briznas instanciadas que se mecen con el viento
 * y se apartan cuando el gato pasa entre ellas (todo en el shader).
 * @param {(x:number, z:number) => boolean} allowed dónde puede crecer
 */
export function grassField({ half, count, allowed, rand }) {
  const H = 0.24;
  const geo = new THREE.PlaneGeometry(0.045, H, 1, 4);
  geo.translate(0, H / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { // afinar la punta
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) * (1 - (y / H) * 0.85));
  }
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const uniforms = { uTime: { value: 0 }, uCat: { value: new THREE.Vector3(999, 0, 999) } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec3 uCat; varying float vBend;')
      .replace('#include <project_vertex>', `
        float bend = clamp(transformed.y / ${H.toFixed(3)}, 0.0, 1.0);
        vBend = bend;
        vec4 wpos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vec4 root = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float b2 = bend * bend;
        // viento: ondas que recorren el campo
        float w = sin(uTime * 1.8 + root.x * 0.45 + root.z * 0.3) * 0.5 + sin(uTime * 3.1 + root.x * 1.3) * 0.25;
        wpos.x += w * 0.06 * b2;
        wpos.z += cos(uTime * 1.3 + root.z * 0.5) * 0.03 * b2;
        // el gato aparta el pasto a su paso
        vec2 d = root.xz - uCat.xz;
        float dist = length(d);
        float push = smoothstep(0.55, 0.0, dist);
        wpos.xz += (d / max(dist, 0.001)) * push * 0.16 * bend;
        wpos.y -= push * 0.08 * bend;
        vec4 mvPosition = viewMatrix * wpos;
        gl_Position = projectionMatrix * mvPosition;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBend;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.45, 1.15, vBend);');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 4; tries++) {
    const x = (rand() * 2 - 1) * half, z = (rand() * 2 - 1) * half;
    if (!allowed(x, z)) continue;
    q.setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0));
    const k = 0.6 + rand() * 0.8;
    s.set(1, k, 1); p.set(x, 0, z);
    m4.compose(p, q, s);
    mesh.setMatrixAt(n, m4);
    mesh.setColorAt(n, c.setHSL(0.25 + rand() * 0.06, 0.5 + rand() * 0.2, 0.38 + rand() * 0.12));
    n++;
  }
  mesh.count = n;
  mesh.frustumCulled = false; // el viento mueve los vértices fuera de la caja original
  return {
    object: mesh,
    update(t, catPos) { uniforms.uTime.value = t; if (catPos) uniforms.uCat.value.copy(catPos); },
  };
}

/** Arbustos redondos tipo "nube" (varias esferas facetadas). */
export function bushes({ spots, rand, physics }) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const blobs = [];
  for (const [x, z, size] of spots) {
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r = rand() * size * 0.55;
      const s = size * (0.45 + rand() * 0.35);
      blobs.push([x + Math.cos(a) * r, s * 0.7, z + Math.sin(a) * r, s]);
    }
    physics?.addStaticCylinder(new THREE.Vector3(x, 0, z), size * 0.6, size * 0.9);
  }
  const mesh = new THREE.InstancedMesh(geo, mat, blobs.length);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  blobs.forEach(([x, y, z, s], i) => {
    m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand(), rand())), new THREE.Vector3(s, s * 0.85, s));
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, c.setHSL(0.28 + rand() * 0.05, 0.45 + rand() * 0.15, 0.28 + rand() * 0.1));
  });
  mesh.castShadow = true; mesh.receiveShadow = true;
  return { object: mesh };
}

/** Flores pequeñas de colores. */
export function flowers({ spots }) {
  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), col = new THREE.Color();
  const colors = [0xff8fb8, 0xffe066, 0xffffff, 0xb79cff, 0xff9d5c, 0x8fd3ff];
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4), new THREE.MeshLambertMaterial({ color: 0x3f8a3a }), spots.length);
  const headGeo = new THREE.IcosahedronGeometry(0.028, 0); headGeo.scale(1, 0.55, 1);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshLambertMaterial(), spots.length);
  spots.forEach(([x, z, h, ci], i) => {
    m4.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(1, h, 1)); stems.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(1, 1, 1)); heads.setMatrixAt(i, m4);
    heads.setColorAt(i, col.set(colors[ci % colors.length]));
  });
  const g = new THREE.Group(); g.add(stems, heads);
  return { object: g };
}

function wingTexture(a, b) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(8, 32, 4, 20, 32, 40);
  grad.addColorStop(0, b); grad.addColorStop(1, a);
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(2, 32);
  g.bezierCurveTo(10, -4, 64, 0, 56, 24); g.bezierCurveTo(52, 32, 40, 32, 34, 34);
  g.bezierCurveTo(52, 40, 54, 60, 36, 60); g.bezierCurveTo(22, 62, 8, 46, 2, 32); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)';
  g.beginPath(); g.arc(40, 16, 4, 0, 7); g.fill(); g.beginPath(); g.arc(36, 50, 3, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Mariposas que revolotean alrededor de puntos y se acercan al gato. */
export function butterflies({ homes, rand }) {
  const g = new THREE.Group();
  const pairs = [['#ff8fb8', '#fff2a8'], ['#8fd3ff', '#ffffff'], ['#ffb347', '#ffe066'], ['#b79cff', '#ffd6f6'], ['#ffffff', '#fff7c2']];
  const wingGeo = new THREE.PlaneGeometry(0.11, 0.11); wingGeo.translate(0.055, 0, 0);
  const list = homes.map((home, i) => {
    const [a, b] = pairs[i % pairs.length];
    const mat = new THREE.MeshBasicMaterial({ map: wingTexture(a, b), transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.05 });
    const bf = new THREE.Group();
    const L = new THREE.Mesh(wingGeo, mat), R = new THREE.Mesh(wingGeo, mat); R.scale.x = -1;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.05, 2, 4), new THREE.MeshBasicMaterial({ color: 0x2a1c18 }));
    body.rotation.x = Math.PI / 2;
    bf.add(L, R, body); bf.rotation.order = 'YXZ'; g.add(bf);
    return { bf, L, R, home, ph: rand() * 10, sp: 0.4 + rand() * 0.5, r: 0.5 + rand() * 1.4, y: 0.4 + rand() * 0.9 };
  });
  const prev = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
  return {
    object: g,
    update(t, dt, catPos) {
      for (const o of list) {
        o.ph += dt * o.sp;
        prev.copy(o.bf.position);
        o.bf.position.set(o.home.x + Math.sin(o.ph) * o.r + Math.sin(o.ph * 2.3) * 0.2, o.y + Math.sin(o.ph * 3.1) * 0.15, o.home.z + Math.cos(o.ph * 0.8) * o.r);
        if (catPos && Math.hypot(catPos.x - o.bf.position.x, catPos.z - o.bf.position.z) < 1.4) o.bf.position.lerp(tmp.copy(catPos).setY(catPos.y + 0.55), 0.22);
        dir.subVectors(o.bf.position, prev);
        if (dir.lengthSq() > 1e-8) o.bf.rotation.y = Math.atan2(dir.x, dir.z);
        const flap = Math.sin(t * 18 + o.ph * 5) * 1.1;
        o.L.rotation.y = flap; o.R.rotation.y = -flap; o.bf.rotation.x = -0.3;
      }
    },
  };
}
