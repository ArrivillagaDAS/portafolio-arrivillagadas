import * as THREE from 'three';

const WALK = 1.1;      // m/s
const RUN = 2.4;       // m/s
const ACCEL = 10;      // suavizado de velocidad
const JUMP_V = 4.6;    // m/s → ~0.6 m de alto con gravedad 18
const COYOTE = 0.12;   // s de gracia para saltar tras dejar un borde
const BUFFER = 0.12;   // s que se recuerda un salto pulsado antes de tocar suelo
const RADIUS = 0.11, HALF = 0.06; // cápsula: 0.34 m de alto

/** Mueve al gato con el character controller cinemático de Rapier y elige la animación. */
export class CatController {
  /**
   * @param {import('../physics/Physics.js').Physics} physics
   * @param {import('../cat/GamerCat.js').GamerCat} cat
   * @param {import('../input/Input.js').Input} input
   */
  constructor(physics, cat, input, { walk = WALK, run = RUN } = {}) {
    this.walk = walk; this.run = run; // m/s (el mundo abierto usa velocidades mayores)
    this.speedMul = 1;   // < 1 en el agua
    this.canJump = true; // false dentro del laberinto
    const { RAPIER, world } = physics;
    this.physics = physics; this.cat = cat; this.input = input;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(HALF, RADIUS).setFriction(0), this.body);
    this.ctrl = world.createCharacterController(0.01);
    this.ctrl.setUp({ x: 0, y: 1, z: 0 });
    this.ctrl.enableAutostep(0.07, 0.05, true); // sube teclados, alfombras, bordes
    this.ctrl.enableSnapToGround(0.05);
    this.ctrl.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    this.ctrl.setApplyImpulsesToDynamicBodies(true); // empuja la taza, libros, cajas…
    this.ctrl.setCharacterMass(3);

    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.grounded = false;
    this.sinceGround = 0;
    this.sinceJumpPress = 1;
    this.yaw = 0;
    this.camYaw = Math.PI / 4; // dirección "adelante" según la cámara diorama
    this.prev = new THREE.Vector3();
    this.curr = new THREE.Vector3();
  }

  spawn(p) {
    const y = p.y + HALF + RADIUS + 0.02;
    this.body.setTranslation({ x: p.x, y, z: p.z }, true);
    this.body.setNextKinematicTranslation({ x: p.x, y, z: p.z });
    this.curr.set(p.x, y, p.z); this.prev.copy(this.curr);
    this.vel.set(0, 0, 0); this.vy = 0;
    this.spawnPoint = p.clone();
  }

  get position() { return this.curr; }

  /** Punto justo delante del hocico (para el cabezazo). */
  frontPoint(dist = 0.24) {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(dist).add(this.curr).setY(this.curr.y - 0.04);
  }

  /** Reproduce una animación especial y bloquea el movimiento un momento. */
  perform(clip, seconds) {
    this.override = clip;
    this.frozen = seconds;
    this.cat.current?.stop?.();
    this.cat.current = null;
  }

  /** Un subpaso de física de duración fija. */
  fixedStep(dt) {
    const inp = this.frozen > 0 ? { x: 0, y: 0, mag: 0 } : this.input.move;
    if (this.frozen > 0) { this.frozen -= dt; if (this.frozen <= 0) this.override = null; }
    // convertir la dirección de pantalla al plano del suelo según la cámara
    const fwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = right.multiplyScalar(inp.x).addScaledVector(fwd, inp.y);
    const speed = (this.input.running ? this.run : this.walk) * inp.mag * this.speedMul;
    if (wish.lengthSq() > 1e-4) wish.normalize().multiplyScalar(speed);
    const k = 1 - Math.exp(-ACCEL * dt * (this.grounded ? 1 : 0.6)); // algo menos de control en el aire
    this.vel.x += (wish.x - this.vel.x) * k;
    this.vel.z += (wish.z - this.vel.z) * k;

    // salto con "coyote time" y buffer
    this.sinceGround = this.grounded ? 0 : this.sinceGround + dt;
    if (this.input.consumeJump() && !(this.frozen > 0) && this.canJump) this.sinceJumpPress = 0; else this.sinceJumpPress += dt;
    if (this.hopQueued && this.grounded) { this.hopQueued = false; this.vy = JUMP_V * 0.7; this.sinceGround = COYOTE; this.jumped = true; }
    this.jumped = false;
    if (this.sinceJumpPress < BUFFER && this.sinceGround < COYOTE) {
      this.vy = JUMP_V; this.sinceGround = COYOTE; this.sinceJumpPress = BUFFER; this.jumped = true;
    }
    this.vy += this.physics.world.gravity.y * dt;
    if (this.vy < -12) this.vy = -12;

    const desired = { x: this.vel.x * dt, y: this.vy * dt, z: this.vel.z * dt };
    this.ctrl.computeColliderMovement(this.collider, desired);
    const mv = this.ctrl.computedMovement();
    this.grounded = this.ctrl.computedGrounded();
    if (this.grounded && this.vy < 0) this.vy = -0.5;
    // techo / golpe contra algo por arriba
    if (this.vy > 0 && mv.y < desired.y * 0.5) this.vy = 0;

    const t = this.body.translation();
    this.prev.copy(this.curr);
    this.curr.set(t.x + mv.x, t.y + mv.y, t.z + mv.z);
    this.body.setNextKinematicTranslation(this.curr);
    if (this.curr.y < -2) this.spawn(this.spawnPoint);
  }

  /** Actualiza el modelo visual y la animación (una vez por frame). */
  update(dt, alpha = 1) {
    const root = this.cat.root;
    root.position.lerpVectors(this.prev, this.curr, alpha);
    root.position.y -= HALF + RADIUS; // los pies del modelo en la base de la cápsula

    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.15) {
      const target = Math.atan2(this.vel.x, this.vel.z);
      let d = target - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 12);
    }
    root.rotation.y = this.yaw;

    if (this.override) {
      this.cat.play(this.override, 0.1);
      if (this.cat.current) this.cat.current.timeScale = 1;
      return;
    }
    let clip;
    if (!this.grounded && this.sinceGround > 0.08) clip = this.vy > 0.5 && this.sinceGround < 0.25 ? 'Jump_Start' : 'Jump_Loop';
    else if (hs > (this.walk + this.run) / 2) clip = 'Run';
    else if (hs > 0.12) clip = 'Walk';
    else clip = 'Idle';
    this.cat.play(clip, 0.15);
    const a = this.cat.current;
    if (a) a.timeScale = clip === 'Walk' ? THREE.MathUtils.clamp(hs / this.walk, 0.6, 1.4) : clip === 'Run' ? THREE.MathUtils.clamp(hs / this.run, 0.8, 1.3) : 1;
  }
}
