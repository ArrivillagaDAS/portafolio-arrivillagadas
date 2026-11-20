import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

const STEP = 1 / 60;

/** Envoltura mínima de Rapier: colisionadores estáticos, cuerpos dinámicos sincronizados y paso fijo. */
export class Physics {
  static async create() {
    await RAPIER.init();
    return new Physics();
  }

  constructor() {
    this.RAPIER = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -18, z: 0 }); // gravedad "de juego": saltos más ágiles
    this.world.timestep = STEP;
    this.dynamics = []; // { body, object }
    this.acc = 0;
  }

  /** Caja estática alineada a ejes a partir de un Box3 en metros. */
  addStaticBox(box) {
    const c = box.getCenter(new THREE.Vector3());
    const h = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z).setFriction(0.8), body);
    return body;
  }

  /**
   * Colisionador con la forma exacta de un modelo (triángulos reales):
   * el gato se sienta EN el sofá, no sobre una caja invisible.
   */
  addStaticTrimesh(object) {
    object.updateMatrixWorld(true);
    const verts = [], idx = [];
    const v = new THREE.Vector3();
    object.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry, pos = g.attributes.position, base = verts.length / 3;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); verts.push(v.x, v.y, v.z); }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
      else for (let i = 0; i < pos.count; i++) idx.push(base + i);
    });
    if (!idx.length) return null;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(idx)).setFriction(0.8), body);
    return body;
  }

  /**
   * Cuerpo dinámico para un objeto cuyo pivote ya está en el centro de su caja.
   * @param {THREE.Object3D} object
   * @param {THREE.Vector3} half medias dimensiones
   */
  addDynamicBox(object, half, { density = 0.6, friction = 0.6, restitution = 0.15 } = {}) {
    const p = object.position, q = object.quaternion;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(p.x, p.y, p.z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setLinearDamping(0.2)
        .setAngularDamping(0.4)
        .setCanSleep(true),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setDensity(density).setFriction(friction).setRestitution(restitution),
      body,
    );
    this.dynamics.push({ body, object, home: { p: p.clone(), q: q.clone() } });
    return body;
  }

  /** Cilindro estático vertical (bordes de lago, troncos gruesos). */
  addStaticCylinder(center, radius, height) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y + height / 2, center.z));
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(height / 2, radius).setFriction(0.8), body);
    return body;
  }

  /**
   * Cuerpo dinámico hecho de varias cajas (p. ej. una letra de bloques).
   * @param {THREE.Object3D} object pivote en el centro del cuerpo
   * @param {{x:number,y:number,z:number,hx:number,hy:number,hz:number}[]} boxes cajas en coordenadas locales
   */
  addDynamicCompound(object, boxes, { density = 0.5, friction = 0.7, restitution = 0.1 } = {}) {
    const p = object.position, q = object.quaternion;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setLinearDamping(0.2).setAngularDamping(0.5).setCanSleep(true),
    );
    for (const b of boxes) {
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(b.hx, b.hy, b.hz).setTranslation(b.x, b.y, b.z).setDensity(density).setFriction(friction).setRestitution(restitution),
        body,
      );
    }
    this.dynamics.push({ body, object, home: { p: p.clone(), q: q.clone() } });
    return body;
  }

  /** Esfera dinámica (estambres, pelotas). */
  addDynamicBall(object, radius, { density = 0.4, friction = 0.8, restitution = 0.35 } = {}) {
    const p = object.position;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setLinearDamping(0.35).setAngularDamping(0.6).setCanSleep(true),
    );
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius).setDensity(density).setFriction(friction).setRestitution(restitution), body);
    this.dynamics.push({ body, object, home: { p: p.clone(), q: object.quaternion.clone() } });
    return body;
  }

  /**
   * Empuja los objetos dinámicos cercanos a un punto (el cabezazo del gato).
   * @returns número de objetos empujados
   */
  pushNear(point, dir, { radius = 0.35, strength = 1.1, lift = 0.35 } = {}) {
    let n = 0;
    for (const d of this.dynamics) {
      const t = d.body.translation();
      const dist = Math.hypot(t.x - point.x, (t.y - point.y) * 0.7, t.z - point.z);
      if (dist > radius) continue;
      const m = d.body.mass();
      const f = strength * m * (1 - dist / radius * 0.5);
      d.body.applyImpulse({ x: dir.x * f, y: lift * f, z: dir.z * f }, true);
      d.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * f * 0.02, y: (Math.random() - 0.5) * f * 0.02, z: (Math.random() - 0.5) * f * 0.02 }, true);
      n++;
    }
    return n;
  }

  /** Avanza con paso fijo; `beforeStep` corre en cada subpaso (ahí se mueve al personaje). */
  step(dt, beforeStep) {
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= STEP) {
      beforeStep?.(STEP);
      this.world.step();
      this.acc -= STEP;
    }
    for (const d of this.dynamics) {
      const t = d.body.translation(), r = d.body.rotation();
      d.object.position.set(t.x, t.y, t.z);
      d.object.quaternion.set(r.x, r.y, r.z, r.w);
      // si algo cae fuera del cuarto, vuelve a su sitio
      if (t.y < -3) {
        d.body.setTranslation(d.home.p, true);
        d.body.setRotation(d.home.q, true);
        d.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        d.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }
}
