// spaSHial: the sketch-facing 3D engine (milestone 1). The API is plans/spashial/spashial.d.ts;
// physics is physics.js (Jolt), drawing is three.js on WebGL2. Loaded as an ES module by
// runner.html, which defines the globals below on `window` before the student's code runs.
//
// Frame order, like moSHion: update(step) -> physics step -> (per rendered frame) draw() ->
// render -> perf HUD -> drawTop(). Physics runs at a fixed 60 Hz whatever the screen does, and
// the picture is interpolated between steps so a 144 Hz monitor is smooth.
//
// Not built yet (named in the spec): textures, glTF models, joints, Tiles, the billboard
// `text` label, hull/mesh shapes, sounds, online. Setting an unknown property on an Asset does
// nothing special; it is not an error, as in moSHion.

import * as THREE from 'three';
import initJolt from './vendor/jolt/jolt-physics.wasm.js';
import { createPhysics, FIXED_DT, SHAPES, COLLIDERS } from './physics.js';

const DEG = 180 / Math.PI, RAD = Math.PI / 180;
const S = { // engine state, one per page
  phys: null, scene: null, renderer: null, cam: null, hud: null, hudCtx: null,
  assets: new Set(), groups: new Set(), halted: false, tick: 0, frameMs: 16.7, perf: false,
  renderScale: 1, qualityMode: 'auto', canvasSize: null,
};

// ---------------------------------------------------------------- vectors
function arr3(v, what = 'a position') {
  if (Array.isArray(v) && v.length >= 3) return [+v[0], +v[1], +v[2]];
  if (v && typeof v === 'object' && 'x' in v && 'y' in v) return [+v.x, +v.y, +(v.z ?? 0)];
  throw new TypeError(`${what} must be [x, y, z] or a vector with x, y and z`);
}
class Vector {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { if (typeof x === 'object') [x, y, z] = arr3(x); this.x = x; this.y = y ?? this.y; this.z = z ?? this.z; return this; }
  copy() { return new Vector(this.x, this.y, this.z); }
  add(v) { const a = typeof v === 'number' ? [v, v, v] : arr3(v); this.set(this.x + a[0], this.y + a[1], this.z + a[2]); return this; }
  sub(v) { const a = typeof v === 'number' ? [v, v, v] : arr3(v); this.set(this.x - a[0], this.y - a[1], this.z - a[2]); return this; }
  mult(n) { this.set(this.x * n, this.y * n, this.z * n); return this; }
  div(n) { return this.mult(1 / n); }
  mag() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const m = this.mag(); return m ? this.mult(1 / m) : this; }
  dist(v) { const a = arr3(v); return Math.hypot(this.x - a[0], this.y - a[1], this.z - a[2]); }
  dot(v) { const a = arr3(v); return this.x * a[0] + this.y * a[1] + this.z * a[2]; }
  cross(v) { const a = arr3(v); return new Vector(this.y * a[2] - this.z * a[1], this.z * a[0] - this.x * a[2], this.x * a[1] - this.y * a[0]); }
  toString() { return `[${this.x}, ${this.y}, ${this.z}]`; }
}
/** A vector that reads and writes somewhere else: `ball.pos.y += 1` moves the ball. */
class LiveVector extends Vector {
  constructor(get, set) {
    super(0, 0, 0);
    Object.defineProperty(this, '_write', { value: set });
    ['x', 'y', 'z'].forEach((k, i) => Object.defineProperty(this, k, {
      enumerable: true, configurable: true,
      get: () => get()[i],
      set: (v) => { const a = get(); a[i] = +v; set(a); },
    }));
  }
  /** One write for all three, so `pos.set(1, 2, 3)` moves a body once. */
  set(x, y, z) {
    const a = typeof x === 'object' ? arr3(x) : [x, y ?? this.y, z ?? this.z];
    this._write(a.map(Number));
    return this;
  }
  copy() { return new Vector(this.x, this.y, this.z); }
}
/** Give `proto` a property `name` that hands out a live vector and accepts [x,y,z] or a vector. */
function liveProperty(proto, name) {
  Object.defineProperty(proto, name, {
    get() { return this._live[name]; },
    set(v) { this._need(); this._live[name].set(arr3(v, name)); },
  });
}
const createVector = (x, y, z) => new Vector(x, y, z);

// ---------------------------------------------------------------- colours
const _c = new THREE.Color();
function parseColor(c) {
  if (typeof c === 'number') { const g = Math.max(0, Math.min(255, c)) / 255; return _c.setRGB(g, g, g, THREE.SRGBColorSpace).clone(); }
  try { return _c.set(String(c)).clone(); } catch { return new THREE.Color('#cccccc'); }
}

// ---------------------------------------------------------------- touch verbs
const asList = (o) => (Array.isArray(o) ? o : [o]);
function touchVerb(self, other, cb, answer) {
  let result = answer.zero;
  for (const o of asList(other)) {
    if (!o || o === self || !o._rec || !self._rec) continue;
    const t = S.phys.touching(self._rec, o._rec);
    const v = answer.of(t);
    if (answer.hit(v)) { if (cb) cb(self, o); result = answer.merge(result, v); }
  }
  return result;
}
const physical = (t) => !!(t && t.physical);
// `merge` combines the answers of several members: "did ANY say yes" for the yes/no verbs, the
// longest count for the counting ones. (It was once `() => true`, which made a Group answer yes
// whenever it was asked, whatever its members said.)
const anyOf = (a, b) => a || b;
const VERBS = {
  collides:    { zero: false, of: (t) => physical(t) && t.began, hit: (v) => v, merge: anyOf },
  colliding:   { zero: 0, of: (t) => (physical(t) ? t.frames : 0), hit: (v) => v > 0, merge: Math.max },
  collided:    { zero: false, of: (t) => physical(t) && t.ended, hit: (v) => v, merge: anyOf },
  overlaps:    { zero: false, of: (t) => !!t && !t.ended, hit: (v) => v, merge: anyOf },
  overlapping: { zero: 0, of: (t) => (t && !t.ended ? t.frames : 0), hit: (v) => v > 0, merge: Math.max },
  overlapped:  { zero: false, of: (t) => !!t && t.ended, hit: (v) => v, merge: anyOf },
};

// ---------------------------------------------------------------- Asset
const COLLIDER_ERR = (v) => new TypeError(`collider must be 'dynamic', 'static', 'kinematic' or 'none' (got ${JSON.stringify(v)})`);
function normCollider(v) {
  const s = String(v).toLowerCase();
  if (s.length === 1) { const m = { d: 'dynamic', s: 'static', k: 'kinematic', n: 'none' }[s]; if (m) return m; }
  if (COLLIDERS.includes(s)) return s;
  throw COLLIDER_ERR(v);
}
const ROUND = new Set(['sphere', 'cylinder', 'capsule', 'cone', 'torus']);
function fit(shape, w, h, d) { // round shapes have one width
  if (shape === 'sphere') return { w, h: w, d: w };
  if (ROUND.has(shape)) return { w, h, d: w };
  return { w, h, d };
}
const DEFAULT_SIZE = { // [w, h, d] multipliers for a single size argument
  box: [1, 1, 1], sphere: [1, 1, 1], cylinder: [1, 1, 1], capsule: [1, 2, 1], cone: [1, 1, 1], torus: [1, 0.35, 1],
};

let nextAssetId = 1;
class Asset {
  constructor(...args) {
    const shape = this.constructor.defaultShape ?? 'box';
    const nums = args.filter((a) => typeof a === 'number');
    const strs = args.filter((a) => typeof a === 'string');
    if (args.length !== nums.length + strs.length) throw new TypeError('new Asset() takes numbers, then an optional collider such as \'static\'');
    let pos, w, h, d;
    if (nums.length === 0) pos = [...S.camTarget];
    else if (nums.length === 3 || nums.length === 4 || nums.length === 6) {
      pos = nums.slice(0, 3);
      if (nums.length === 3) [w, h, d] = DEFAULT_SIZE[shape];
      else if (nums.length === 4) [w, h, d] = DEFAULT_SIZE[shape].map((m) => m * nums[3]);
      else [w, h, d] = nums.slice(3);
    } else throw new TypeError('new Asset() takes x, y, z, then an optional size or w, h, d');
    const size = fit(shape, w ?? 1, h ?? 1, d ?? 1);
    checkSize(shape, size);
    this._id = nextAssetId++;
    this._shape = shape;
    this._color = '#8be9fd';
    this._opacity = 1;
    this._visible = true;
    this._metal = 0;
    this._rough = 0.8;
    this._scale = new Vector(1, 1, 1);
    this._groups = new Set();
    this._removed = false;
    this._collider = strs.length ? normCollider(strs[0]) : 'dynamic';
    this._rec = S.phys.createBody({
      shape, ...size, collider: this._collider, pos, friction: 0.5, bounciness: 0, density: 1, userData: this,
    });
    this._cur = { p: [...pos], q: [0, 0, 0, 1] };
    this._prev = { p: [...pos], q: [0, 0, 0, 1] };
    this._buildMesh();
    this._live = {
      pos: new LiveVector(() => [...this._cur.p], (a) => this._moveTo(a)),
      vel: new LiveVector( // units per frame, like moSHion's pixels per frame
        () => S.phys.getVelocity(this._rec).map((v) => v / 60),
        (a) => S.phys.setVelocity(this._rec, a.map((v) => v * 60))),
      rotation: new LiveVector(() => this._euler(), (a) => this._turnTo(a)), // degrees
      angularVelocity: new LiveVector( // degrees per frame
        () => S.phys.getAngularVelocity(this._rec).map((v) => (v * DEG) / 60),
        (a) => S.phys.setAngularVelocity(this._rec, a.map((v) => v * RAD * 60))),
    };
    S.assets.add(this);
    allAssets.add(this);
  }

  // --- geometry and mesh
  _geometry() {
    const { w, h, d } = this._rec.def;
    switch (this._shape) {
      case 'box': return new THREE.BoxGeometry(w, h, d);
      case 'sphere': return new THREE.SphereGeometry(w / 2, 24, 16);
      case 'cylinder': return new THREE.CylinderGeometry(w / 2, w / 2, h, 24);
      case 'capsule': return new THREE.CapsuleGeometry(w / 2, Math.max(h - w, 0), 8, 20);
      case 'cone': return new THREE.ConeGeometry(w / 2, h, 24);
      case 'torus': { const g = new THREE.TorusGeometry((w - h) / 2, h / 2, 12, 32); g.rotateX(Math.PI / 2); return g; }
      default: throw new Error(`unknown shape '${this._shape}'`);
    }
  }
  _buildMesh() {
    const geometry = this._geometry();
    if (this._mesh) { this._mesh.geometry.dispose(); this._mesh.geometry = geometry; }
    else {
      this._material = new THREE.MeshStandardMaterial({ color: this._color, metalness: this._metal, roughness: this._rough });
      this._mesh = new THREE.Mesh(geometry, this._material);
      this._mesh.castShadow = this._mesh.receiveShadow = true;
      S.scene.add(this._mesh);
    }
    this._syncVisual();
  }
  _syncVisual() {
    const m = this._mesh;
    m.scale.set(this._scale.x, this._scale.y, this._scale.z);
    m.visible = this._visible;
    this._material.opacity = this._opacity;
    this._material.transparent = this._opacity < 1;
    this._material.metalness = this._metal;
    this._material.roughness = this._rough;
    this._material.color.copy(parseColor(this._color));
  }
  _refresh() { // pull the pose from physics; keep the previous one for interpolation
    const { pos, quat } = S.phys.getPose(this._rec);
    this._prev.p = this._cur.p; this._prev.q = this._cur.q;
    this._cur = { p: pos, q: quat };
  }
  _moveTo(a) {
    S.phys.setPose(this._rec, a, this._cur.q);
    this._cur.p = [...a]; this._prev.p = [...a];
  }
  _turnTo(eulerDeg) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(eulerDeg[0] * RAD, eulerDeg[1] * RAD, eulerDeg[2] * RAD, 'YXZ'));
    const qa = [q.x, q.y, q.z, q.w];
    S.phys.setPose(this._rec, this._cur.p, qa);
    this._cur.q = qa; this._prev.q = [...qa];
  }
  _euler() {
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...this._cur.q), 'YXZ');
    return [e.x * DEG, e.y * DEG, e.z * DEG];
  }
  _rebuild(patch) {
    S.phys.rebuild(this._rec, patch);
    this._buildMesh();
  }
  _need() { if (this._removed) throw new Error('this Asset was removed'); }

  // --- position shortcuts (pos, vel, rotation and angularVelocity are live vectors, defined below the class)
  get x() { return this._cur.p[0]; } set x(v) { this.pos.x = v; }
  get y() { return this._cur.p[1]; } set y(v) { this.pos.y = v; }
  get z() { return this._cur.p[2]; } set z(v) { this.pos.z = v; }

  // --- size and shape
  get w() { return this._rec.def.w; } set w(v) { this._resize({ w: +v }); }
  get h() { return this._rec.def.h; } set h(v) { this._resize({ h: +v }); }
  get d() { return this._rec.def.d; } set d(v) { this._resize({ d: +v }); }
  get diameter() { return this._rec.def.w; } set diameter(v) { this._resize({ w: +v }); }
  _resize(patch) {
    const d = this._rec.def;
    const next = { w: d.w, h: d.h, d: d.d, ...patch };
    if (this._shape === 'sphere') { const s = patch.w ?? patch.h ?? patch.d; next.w = next.h = next.d = s; }
    else if (ROUND.has(this._shape)) next.d = next.w = patch.d ?? patch.w ?? next.w;
    checkSize(this._shape, next);
    this._rebuild(next);
  }
  get shape() { return this._shape; }
  set shape(v) {
    const s = v === 'cube' ? 'box' : v;
    if (!SHAPES.includes(s)) throw new TypeError(`shape must be one of ${SHAPES.map((x) => `'${x}'`).join(', ')} (got ${JSON.stringify(v)})`);
    this._shape = s;
    const d = this._rec.def;
    this._rebuild({ shape: s, ...fit(s, d.w, d.h, d.d) });
  }
  get scale() { return this._scale; }
  set scale(v) { this._scale = typeof v === 'number' ? new Vector(v, v, v) : new Vector(...arr3(v, 'scale')); this._syncVisual(); }
  scaleBy(x, y = x, z = x) { this._scale = new Vector(this._scale.x * x, this._scale.y * y, this._scale.z * z); this._syncVisual(); }

  // --- looks
  get color() { return this._color; } set color(v) { this._color = v; this._syncVisual(); }
  get opacity() { return this._opacity; } set opacity(v) { this._opacity = Math.max(0, Math.min(1, +v)); this._syncVisual(); }
  get visible() { return this._visible; } set visible(v) { this._visible = !!v; this._syncVisual(); }
  get metalness() { return this._metal; } set metalness(v) { this._metal = +v; this._syncVisual(); }
  get roughness() { return this._rough; } set roughness(v) { this._rough = +v; this._syncVisual(); }

  // --- physics settings
  get collider() { return this._collider; }
  set collider(v) { this._collider = normCollider(v); this._rebuild({ collider: this._collider }); }
  get bounciness() { return this._rec.def.bounciness; } set bounciness(v) { S.phys.setBounciness(this._rec, +v); }
  get friction() { return this._rec.def.friction; } set friction(v) { S.phys.setFriction(this._rec, +v); }
  get density() { return this._rec.def.density; } set density(v) { this._rebuild({ density: +v, mass: null }); }
  get mass() { return this._collider === 'dynamic' ? S.phys.massOf(this._rec) : 0; }
  set mass(v) { if (this._collider === 'dynamic') this._rebuild({ mass: +v }); }
  get lockRotation() { return this._rec.def.lockRotation; } set lockRotation(v) { this._rebuild({ lockRotation: v }); }

  applyForce(fx, fy, fz) { S.phys.addForce(this._rec, [fx, fy, fz]); }
  applyImpulse(x, y, z) { S.phys.addImpulse(this._rec, [x, y, z]); }
  applyTorque(x, y, z) { S.phys.addTorque(this._rec, [x, y, z]); }

  // --- looking and moving
  lookAt(x, y, z) {
    const t = typeof x === 'number' ? [x, y, z] : arr3(x, 'a target');
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...this._cur.p), new THREE.Vector3(...t), new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    S.phys.setPose(this._rec, this._cur.p, [q.x, q.y, q.z, q.w]);
    this._cur.q = [q.x, q.y, q.z, q.w]; this._prev.q = [...this._cur.q];
  }
  distanceTo(x, y, z) { const t = typeof x === 'number' ? [x, y, z] : arr3(x, 'a target'); return Math.hypot(...this._cur.p.map((v, i) => v - t[i])); }
  moveTowards(target, tracking = 0.1) { const t = arr3(target, 'a target'); this._moveTo(this._cur.p.map((v, i) => v + (t[i] - v) * tracking)); }
  moveAway(target, repel = 0.1) { const t = arr3(target, 'a target'); this._moveTo(this._cur.p.map((v, i) => v - (t[i] - v) * repel)); }

  clone() {
    const Ctor = this instanceof Floor ? Asset : this.constructor; // Floor's constructor takes a size, not a position
    const c = new Ctor(...this._cur.p, this._rec.def.w, this._rec.def.h, this._rec.def.d, this._collider);
    if (this instanceof Floor) c.shape = 'box';
    c.color = this._color; c.opacity = this._opacity; c.visible = this._visible;
    c.friction = this.friction; c.bounciness = this.bounciness; c.density = this.density;
    c._scale = this._scale.copy(); c._syncVisual();
    c.rotation = this.rotation.copy();
    return c;
  }
  remove() {
    if (this._removed) return;
    this._removed = true;
    S.phys.removeBody(this._rec);
    S.scene.remove(this._mesh);
    this._mesh.geometry.dispose(); this._material.dispose();
    S.assets.delete(this);
    for (const g of [...this._groups]) g._drop(this);
    allAssets._drop(this);
  }
  delete() { this.remove(); }
  get removed() { return this._removed; }

  // --- pointer: a ray from the camera through the mouse
  get mouse() { return (this._mouse ??= makeAssetMouse(this)); }
}
for (const name of ['pos', 'vel', 'rotation', 'angularVelocity']) liveProperty(Asset.prototype, name);
for (const verb of Object.keys(VERBS)) {
  Asset.prototype[verb] = function (other, cb) { return touchVerb(this, other, cb, VERBS[verb]); };
}
function checkSize(shape, { w, h, d }) {
  for (const [k, v] of [['w', w], ['h', h], ['d', d]]) if (!(v > 0)) throw new RangeError(`${k} must be above 0 (got ${v})`);
  if (shape === 'torus' && !(h < w)) throw new RangeError(`a torus needs h (the thickness of the ring) smaller than w (across), got h ${h}, w ${w}`);
}
class Cube extends Asset { static defaultShape = 'box'; }
class Sphere extends Asset { static defaultShape = 'sphere'; }
class Cylinder extends Asset { static defaultShape = 'cylinder'; }
class Capsule extends Asset { static defaultShape = 'capsule'; }
class Cone extends Asset { static defaultShape = 'cone'; }
class Torus extends Asset { static defaultShape = 'torus'; }
/** A big flat static body whose top surface is at y = 0. */
class Floor extends Asset {
  static defaultShape = 'box';
  constructor(size = 40) {
    super(0, -0.5, 0, size, 1, size, 'static');
    this._color = '#44475a'; this._syncVisual();
  }
}

// ---------------------------------------------------------------- Group
class Group extends Array {
  static get [Symbol.species]() { return Array; } // filter/map give plain arrays
  constructor() {
    super();
    Object.defineProperty(this, '_defaults', { value: {}, writable: true });
    const group = this;
    Object.defineProperty(this, 'Asset', { value: class extends Asset {
      constructor(...a) { super(...a); group._join(this); for (const [k, v] of Object.entries(group._defaults)) this[k] = v; }
    } });
    S.groups.add(this);
  }
  _join(a) { if (!this.includes(a)) { Array.prototype.push.call(this, a); a._groups.add(this); } }
  _drop(a) { const i = this.indexOf(a); if (i >= 0) Array.prototype.splice.call(this, i, 1); a._groups.delete(this); }
  newAsset(x, y, z, size) { return new this.Asset(x, y, z, ...(size === undefined ? [] : [size])); }
  push(...as) { for (const a of as) this._join(a); return this.length; }
  add(...as) { return this.push(...as); }
  contains(a) { return this.includes(a); }
  remove(a) { this._drop(a); }
  delete() { for (const a of [...this]) a.remove(); }
  get amount() { return this.length; }
  set amount(n) { while (this.length > n) this[this.length - 1].remove(); while (this.length < n) this.newAsset(0, 0, 0); }
  applyForce(x, y, z) { for (const a of this) a.applyForce(x, y, z); }
  /** Removes members that fell below y = -50 or drifted more than 200 units out, plus `margin`. */
  cull(margin = 0, cb) {
    let n = 0;
    for (const a of [...this]) {
      const [x, y, z] = a._cur.p;
      if (y < -50 - margin || Math.hypot(x, z) > 200 + margin) { n++; if (cb) cb(a, n); else a.remove(); }
    }
    return n;
  }
}
for (const verb of Object.keys(VERBS)) {
  Group.prototype[verb] = function (other, cb) {
    const v = VERBS[verb];
    let result = v.zero;
    for (const a of this) result = v.merge(result, touchVerb(a, other, cb, v));
    return result;
  };
}
for (const key of ['color', 'collider', 'bounciness', 'friction', 'density', 'opacity', 'visible']) {
  Object.defineProperty(Group.prototype, key, {
    get() { return this._defaults[key]; },
    set(v) { this._defaults[key] = v; for (const a of this) a[key] = v; },
  });
}
const allAssets = new Group();

// ---------------------------------------------------------------- input
const norm = (k) => { const s = String(k).toLowerCase(); return s === ' ' ? 'space' : s.replace(/^arrow/, '').replace('control', 'ctrl'); };
const keys = { down: new Map(), pressed: new Set(), released: new Set() };
const kb = {
  presses: (k) => (k === undefined ? keys.pressed.size > 0 : keys.pressed.has(norm(k))),
  pressing: (k) => (k === undefined ? Math.max(0, ...keys.down.values()) : keys.down.get(norm(k)) ?? 0),
  released: (k) => (k === undefined ? keys.released.size > 0 : keys.released.has(norm(k))),
};
const mouse = {
  x: 0, y: 0, moved: { x: 0, y: 0 }, _down: new Map(), _pressed: new Set(), _released: new Set(),
  presses: (b = 'left') => mouse._pressed.has(b),
  pressing: (b = 'left') => mouse._down.get(b) ?? 0,
  released: (b = 'left') => mouse._released.has(b),
  lock() { try { S.renderer.domElement.requestPointerLock?.(); } catch { console.warn('mouse.lock() was blocked by the page'); } },
};
const BUTTON = ['left', 'center', 'right'];
function bindInput() {
  addEventListener('keydown', (e) => {
    const k = norm(e.key);
    if (!keys.down.has(k)) { keys.pressed.add(k); keys.down.set(k, 0); }
    if (['up', 'down', 'left', 'right', 'space'].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { const k = norm(e.key); keys.down.delete(k); keys.released.add(k); });
  addEventListener('blur', () => keys.down.clear());
  const el = S.renderer.domElement;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    mouse.moved.x += e.movementX || 0; mouse.moved.y += e.movementY || 0;
  });
  el.addEventListener('pointerdown', (e) => { const b = BUTTON[e.button] ?? 'left'; if (!mouse._down.has(b)) { mouse._pressed.add(b); mouse._down.set(b, 0); } window.focus(); });
  addEventListener('pointerup', (e) => { const b = BUTTON[e.button] ?? 'left'; mouse._down.delete(b); mouse._released.add(b); });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
function endOfTickInput() {
  for (const [k, n] of keys.down) keys.down.set(k, n + 1);
  for (const [b, n] of mouse._down) mouse._down.set(b, n + 1);
  keys.pressed.clear(); keys.released.clear(); mouse._pressed.clear(); mouse._released.clear();
  mouse.moved.x = mouse.moved.y = 0;
}

// ---------------------------------------------------------------- world, picking
function pickRay(sx, sy) { // a world-space ray from the camera through a screen point
  const el = S.renderer.domElement, w = el.clientWidth, h = el.clientHeight;
  const ndc = new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1);
  S.cam.updateMatrixWorld(); // the camera may have moved since the last render
  const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, S.cam);
  const o = rc.ray.origin, d = rc.ray.direction;
  return { from: [o.x, o.y, o.z], to: [o.x + d.x * 1000, o.y + d.y * 1000, o.z + d.z * 1000] };
}
const shapeHit = (h) => (h ? { asset: h.rec.userData ?? null, point: new Vector(...h.point), normal: new Vector(...h.normal), fraction: h.fraction } : null);
const pt = (a, b, c) => (typeof a === 'number' ? [a, b, c] : arr3(a, 'a point'));
const liveGravity = new LiveVector(() => S.phys.gravity, (a) => { S.phys.gravity = a; });
const world = {
  get gravity() { return liveGravity; },
  set gravity(v) { liveGravity.set(arr3(v, 'gravity')); },
  get allowSleeping() { return S.phys.allowSleeping; }, set allowSleeping(v) { S.phys.allowSleeping = v; },
  autoStep: true,
  physicsUpdate() { S.phys.step(); syncAll(); },
  getAssetAt(sx, sy) { const r = pickRay(sx, sy); const h = S.phys.rayCast(r.from, r.to); return h?.rec.userData ?? undefined; },
  rayCast(a, b, c, d, e, f) {
    const [from, to] = typeof a === 'number' ? [[a, b, c], [d, e, f]] : [pt(a), pt(b)];
    return shapeHit(S.phys.rayCast(from, to));
  },
  rayCastAll(a, b, c, d, e, f) {
    const [from, to] = typeof a === 'number' ? [[a, b, c], [d, e, f]] : [pt(a), pt(b)];
    return S.phys.rayCastAll(from, to).map(shapeHit);
  },
  explodeAt(x, y, z, radius = 5, magnitude = 10, falloff = 0) {
    const c = typeof x === 'number' ? [x, y, z] : arr3(x, 'a point');
    S.phys.explodeAt(c, radius, magnitude, falloff);
  },
};
function makeAssetMouse(a) {
  const over = () => world.getAssetAt(mouse.x, mouse.y) === a;
  let was = false;
  return {
    hovering: over,
    hovers() { const n = over(); const r = n && !was; was = n; return r; },
    hovered() { const n = over(); const r = !n && was; was = n; return r; },
    presses: (b) => over() && mouse.presses(b),
    pressing: (b) => over() && mouse.pressing(b) > 0,
    released: (b) => over() && mouse.released(b),
  };
}

// ---------------------------------------------------------------- camera, lights, background
const cameraState = { mode: 'free', target: null, opts: {}, orbit: { center: [0, 0, 0], dist: 8, yaw: 0, pitch: 0.4, drag: false } };
S.camTarget = [0, 0, 0];
const camera = {
  get pos() { return new LiveVector(() => S.cam.position.toArray(), (a) => S.cam.position.set(...a)); },
  set pos(v) { S.cam.position.set(...arr3(v)); },
  get x() { return S.cam.position.x; }, set x(v) { S.cam.position.x = v; },
  get y() { return S.cam.position.y; }, set y(v) { S.cam.position.y = v; },
  get z() { return S.cam.position.z; }, set z(v) { S.cam.position.z = v; },
  get fov() { return S.cam.fov; }, set fov(v) { S.cam.fov = +v; S.cam.updateProjectionMatrix(); },
  lookAt(x, y, z) { const t = typeof x === 'number' ? [x, y, z] : arr3(x, 'a target'); S.camTarget = t; S.cam.lookAt(...t); },
  follow(target, opts = {}) { cameraState.mode = 'follow'; cameraState.target = target; cameraState.opts = { distance: 8, height: 4, tracking: 0.1, ...opts }; },
  orbit(target, opts = {}) {
    const c = arr3(target, 'a target');
    const o = S.cam.position;
    Object.assign(cameraState.orbit, {
      center: c, dist: opts.distance ?? (Math.hypot(o.x - c[0], o.y - c[1], o.z - c[2]) || 8), drag: !!opts.drag,
      yaw: Math.atan2(o.x - c[0], o.z - c[2]), pitch: Math.asin((o.y - c[1]) / (Math.hypot(o.x - c[0], o.y - c[1], o.z - c[2]) || 1)),
    });
    cameraState.mode = 'orbit';
  },
  free() { cameraState.mode = 'free'; },
};
function updateCamera() {
  const m = cameraState.mode;
  if (m === 'follow' && cameraState.target && !cameraState.target._removed) {
    const t = cameraState.target, { distance, height, tracking } = cameraState.opts;
    const behind = new THREE.Vector3(0, 0, distance).applyQuaternion(new THREE.Quaternion(...t._cur.q));
    const want = new THREE.Vector3(...t._cur.p).add(behind).add(new THREE.Vector3(0, height, 0));
    S.cam.position.lerp(want, tracking);
    S.camTarget = [...t._cur.p]; S.cam.lookAt(...S.camTarget);
  } else if (m === 'orbit') {
    const o = cameraState.orbit;
    if (o.drag && mouse.pressing('left') > 0) { o.yaw -= mouse.moved.x * 0.01; o.pitch = Math.max(-1.4, Math.min(1.4, o.pitch + mouse.moved.y * 0.01)); }
    const c = o.center;
    S.cam.position.set(c[0] + o.dist * Math.sin(o.yaw) * Math.cos(o.pitch), c[1] + o.dist * Math.sin(o.pitch), c[2] + o.dist * Math.cos(o.yaw) * Math.cos(o.pitch));
    S.camTarget = c; S.cam.lookAt(...c);
  }
}
const ambientLight = {
  get color() { return '#' + S.ambient.color.getHexString(); }, set color(v) { S.ambient.color.copy(parseColor(v)); },
  get intensity() { return S.ambient.intensity; }, set intensity(v) { S.ambient.intensity = +v; },
};
const sunLight = {
  get color() { return '#' + S.sun.color.getHexString(); }, set color(v) { S.sun.color.copy(parseColor(v)); },
  get intensity() { return S.sun.intensity; }, set intensity(v) { S.sun.intensity = +v; },
  get direction() { return new LiveVector(() => S.sunDir, (a) => setSunDirection(a)); }, set direction(v) { setSunDirection(arr3(v, 'a direction')); },
  get shadows() { return S.sun.castShadow; }, set shadows(on) { S.sun.castShadow = !!on; S.renderer.shadowMap.enabled = !!on; S.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
};
function setSunDirection(a) { S.sunDir = a; const d = new THREE.Vector3(...a).normalize(); S.sun.position.copy(d.clone().multiplyScalar(-30)); S.sun.target.position.set(0, 0, 0); }
class PointLight {
  constructor(x, y, z, color = '#ffffff', intensity = 30) { this._l = new THREE.PointLight(parseColor(color), intensity, 0, 2); this._l.position.set(x, y, z); S.scene.add(this._l); }
  get pos() { return new LiveVector(() => this._l.position.toArray(), (a) => this._l.position.set(...a)); } set pos(v) { this._l.position.set(...arr3(v)); }
  get color() { return '#' + this._l.color.getHexString(); } set color(v) { this._l.color.copy(parseColor(v)); }
  get intensity() { return this._l.intensity; } set intensity(v) { this._l.intensity = +v; }
  remove() { S.scene.remove(this._l); this._l.dispose?.(); }
}
class SpotLight extends PointLight {
  constructor(x, y, z, color = '#ffffff', intensity = 60) {
    super(x, y, z, color, intensity);
    S.scene.remove(this._l);
    this._l = new THREE.SpotLight(parseColor(color), intensity, 0, Math.PI / 6, 0.3, 2);
    this._l.position.set(x, y, z); S.scene.add(this._l, this._l.target);
  }
  get angle() { return this._l.angle * DEG; } set angle(v) { this._l.angle = v * RAD; }
  lookAt(x, y, z) { const t = typeof x === 'number' ? [x, y, z] : arr3(x, 'a target'); this._l.target.position.set(...t); }
}
function background(c) { S.scene.background = parseColor(c); }

// ---------------------------------------------------------------- 2D layer: HUD
const hudState = { fill: '#ffffff', stroke: null, weight: 1, size: 16, align: 'left' };
const hud = {
  fill: (c, g, b) => { hudState.fill = typeof g === 'number' ? `rgb(${c},${g},${b})` : typeof c === 'number' ? `rgb(${c},${c},${c})` : c; },
  noFill: () => { hudState.fill = null; },
  stroke: (c) => { hudState.stroke = typeof c === 'number' ? `rgb(${c},${c},${c})` : c; },
  noStroke: () => { hudState.stroke = null; },
  strokeWeight: (n) => { hudState.weight = n; },
  textSize: (n) => { hudState.size = n; },
  textAlign: (a) => { hudState.align = a; },
  rect(x, y, w, h) { const c = S.hudCtx; c.lineWidth = hudState.weight; if (hudState.fill) { c.fillStyle = hudState.fill; c.fillRect(x, y, w, h); } if (hudState.stroke) { c.strokeStyle = hudState.stroke; c.strokeRect(x, y, w, h); } },
  circle(x, y, d) { const c = S.hudCtx; c.beginPath(); c.arc(x, y, d / 2, 0, Math.PI * 2); c.lineWidth = hudState.weight; if (hudState.fill) { c.fillStyle = hudState.fill; c.fill(); } if (hudState.stroke) { c.strokeStyle = hudState.stroke; c.stroke(); } },
  line(x1, y1, x2, y2) { const c = S.hudCtx; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = hudState.weight; c.strokeStyle = hudState.stroke ?? hudState.fill ?? '#fff'; c.stroke(); },
  text(s, x, y) { const c = S.hudCtx; c.font = `${hudState.size}px system-ui, sans-serif`; c.textAlign = hudState.align; c.textBaseline = 'top'; if (hudState.stroke) { c.strokeStyle = hudState.stroke; c.lineWidth = hudState.weight; c.strokeText(String(s), x, y); } if (hudState.fill) { c.fillStyle = hudState.fill; c.fillText(String(s), x, y); } },
};
function drawPerf() {
  const c = S.hudCtx, r = S.renderer.info.render;
  const lines = [`${(1000 / S.frameMs).toFixed(0)} fps  ${S.frameMs.toFixed(1)} ms`, `draw calls ${r.calls}   triangles ${r.triangles}`, `bodies ${S.phys.bodyCount}   scale ${S.renderScale.toFixed(2)}`];
  c.save(); c.font = '12px ui-monospace, monospace'; c.textBaseline = 'top'; c.textAlign = 'left';
  c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(6, 6, 232, 52);
  c.fillStyle = '#50fa7b'; lines.forEach((l, i) => c.fillText(l, 12, 11 + i * 15));
  c.restore();
}

// ---------------------------------------------------------------- canvas, quality, loop
const QUALITY = { low: 0.5, medium: 0.75, high: 1 };
function applySize() {
  const el = S.renderer.domElement;
  const [w, h] = S.canvasSize ?? [innerWidth, innerHeight];
  S.renderer.setPixelRatio(Math.min(1, S.renderScale)); // never above 1: integrated graphics is the target
  S.renderer.setSize(w, h, false);
  el.style.width = w + 'px'; el.style.height = h + 'px';
  S.hud.width = w; S.hud.height = h; S.hud.style.width = w + 'px'; S.hud.style.height = h + 'px';
  S.cam.aspect = w / h; S.cam.updateProjectionMatrix();
  window.width = w; window.height = h;
}
class Canvas { constructor(w, h) { S.canvasSize = [w, h]; applySize(); } }
function setQuality(q) {
  if (q !== 'auto' && !(q in QUALITY)) throw new TypeError(`quality must be 'auto', 'low', 'medium' or 'high' (got ${JSON.stringify(q)})`);
  S.qualityMode = q;
  if (q !== 'auto') { S.renderScale = QUALITY[q]; applySize(); }
}
// Auto quality. Frame time on a 60 Hz screen is pinned at 16.7 ms whether the GPU is idle or
// nearly full, so headroom cannot be read directly. Instead: drop the render scale when frames
// run long, and every so often TRY a step back up; if that makes frames long again, drop
// again and wait longer before the next try.
let slow = 0, calm = 0, retryAfter = 300;
function autoQuality() {
  if (S.qualityMode !== 'auto') return;
  const long = S.frameMs > 22;
  slow = long ? slow + 1 : 0;
  calm = long ? 0 : calm + 1;
  if (slow >= 20 && S.renderScale > 0.5) {
    S.renderScale = Math.max(0.5, S.renderScale - 0.1); slow = 0; applySize();
    retryAfter = Math.min(retryAfter * 2, 4800); // that was a failed climb, or a real limit: be patient
  } else if (calm >= retryAfter && S.renderScale < 1) {
    S.renderScale = Math.min(1, S.renderScale + 0.05); calm = 0; applySize();
  }
}

function syncAll() { for (const a of S.assets) if (a._collider !== 'static' && (a._collider !== 'dynamic' || S.phys.isAwake(a._rec))) a._refresh(); else { a._prev.p = a._cur.p; a._prev.q = a._cur.q; } }
function render(alpha) {
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  for (const a of S.assets) {
    const m = a._mesh;
    const p = a._prev.p, c = a._cur.p;
    m.position.set(p[0] + (c[0] - p[0]) * alpha, p[1] + (c[1] - p[1]) * alpha, p[2] + (c[2] - p[2]) * alpha);
    q.set(...a._prev.q); q2.set(...a._cur.q); m.quaternion.copy(q.slerp(q2, alpha));
  }
  S.renderer.render(S.scene, S.cam);
}
const hook = (name, ...args) => { const f = window[name]; if (typeof f === 'function') f(...args); };
function fail(e) {
  if (S.halted) return;
  S.halted = true; // stop on the first error, like moSHion, so one mistake is not reported 60 times a second
  window.dispatchEvent(new ErrorEvent('error', { error: e, message: e?.message }));
}

export async function boot() {
  const Jolt = await initJolt({ locateFile: (f) => new URL('./vendor/jolt/' + f, import.meta.url).href });
  S.phys = createPhysics(Jolt, { gravity: [0, 0, 0] });

  const canvas = document.getElementById('canvas') ?? document.body.appendChild(document.createElement('canvas'));
  S.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  S.hud = document.getElementById('hud');
  S.hudCtx = S.hud.getContext('2d');
  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color('#1e1f29');
  S.cam = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  S.cam.position.set(0, 3, 7); S.cam.lookAt(0, 0, 0);
  S.ambient = new THREE.AmbientLight('#ffffff', 0.9); S.scene.add(S.ambient);
  S.sun = new THREE.DirectionalLight('#ffffff', 2.4); S.scene.add(S.sun, S.sun.target);
  S.sun.shadow.camera.left = S.sun.shadow.camera.bottom = -20; S.sun.shadow.camera.right = S.sun.shadow.camera.top = 20; S.sun.shadow.mapSize.set(1024, 1024);
  setSunDirection([-0.4, -1, -0.6]);
  applySize();
  addEventListener('resize', applySize);
  bindInput();

  Object.assign(window, {
    Asset, Cube, Sphere, Cylinder, Capsule, Cone, Torus, Floor, Group, allAssets, world, camera, ambientLight, sunLight,
    PointLight, SpotLight, background, Canvas, kb, mouse, Vector, createVector,
    random: (a, b) => (a === undefined ? Math.random() : b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    degrees: (r) => r * DEG, radians: (d) => d * RAD,
    showPerf: (on = true) => { S.perf = !!on; },
    LEFT: 'left', RIGHT: 'right', CENTER: 'center',
    ...hud,
    STATIC: 'static', DYNAMIC: 'dynamic', KINEMATIC: 'kinematic',
    frameCount: 0, deltaTime: 16.7,
  });
  Object.defineProperty(window, 'quality', { get: () => S.qualityMode, set: setQuality, configurable: true });
  window.__spashial = S; // for tests and the sandbox page

  return {
    start() {
      hook('preload');
      hook('setup');
      let last = performance.now(), acc = 0;
      const frame = (now) => {
        requestAnimationFrame(frame);
        if (S.halted) return;
        const dt = Math.min(now - last, 100); last = now;
        S.frameMs += (dt - S.frameMs) * 0.1;
        window.deltaTime = dt;
        acc += dt / 1000;
        try {
          while (acc >= FIXED_DT) {
            acc -= FIXED_DT;
            window.frameCount++;
            hook('update', FIXED_DT);
            updateCamera();
            if (world.autoStep) { S.phys.step(); syncAll(); }
            endOfTickInput();
          }
          hook('draw');
          render(acc / FIXED_DT);
          S.hudCtx.clearRect(0, 0, S.hud.width, S.hud.height);
          if (S.perf) drawPerf();
          hook('drawTop');
        } catch (e) { fail(e); }
        autoQuality();
      };
      requestAnimationFrame(frame);
    },
  };
}
