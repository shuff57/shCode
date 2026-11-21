// spaSHial physics layer: the ONLY file that talks to Jolt. It knows nothing about
// three.js or the sketch API, so it runs in Node for tests and in the sandboxed
// preview iframe. If the physics library ever changes, this is the file that does.
//
//   import init from '.../jolt-physics.wasm.js';
//   const world = createPhysics(await init(), { gravity: [0, -10, 0] });
//   const floor = world.createBody({ shape: 'box', w: 20, h: 1, d: 20, collider: 'static', pos: [0, -0.5, 0] });
//
// Units: metres, radians, seconds, Y up. The sketch-facing layer converts to the
// per-frame and degree units the API promises (see plans/spashial/spashial.d.ts).
//
// Shape sizes (full extents, not half):
//   box       w h d
//   sphere    w = diameter
//   cylinder  w = diameter, h = height
//   capsule   w = diameter, h = total height (at least w)
//   cone      w = base diameter, h = height (tip up)
//   torus     w = outer diameter, h = tube thickness; lies flat, axis Y
//
// Colliders (moSHion's words): 'dynamic' | 'static' | 'kinematic' | 'none'.
// 'none' is a sensor: it moves by its velocity, nothing is pushed, and it still
// reports overlaps.

export const FIXED_DT = 1 / 60;
export const SHAPES = ['box', 'sphere', 'cylinder', 'capsule', 'cone', 'torus'];
export const COLLIDERS = ['dynamic', 'static', 'kinematic', 'none'];

// A torus has no Jolt primitive: it is a ring of capsules (measured in
// scripts/spashial-bench/torus.mjs: about 2 cm of error at 16, about 6x a sphere's cost).
export const TORUS_SEGMENTS = 16;

const L_STATIC = 0, L_MOVING = 1, L_SENSOR = 2, L_QUERY = 3;
const KEY = 67108864; // 2^26: pair key = low id * KEY + high id

/** Volume in m^3 for the default mass (density 1 = 1 kg per m^3). */
export function volumeOf(shape, w, h, d) {
  const r = w / 2;
  switch (shape) {
    case 'box': return w * h * d;
    case 'sphere': return (4 / 3) * Math.PI * r ** 3;
    case 'cylinder': return Math.PI * r * r * h;
    case 'capsule': return Math.PI * r * r * Math.max(h - w, 0) + (4 / 3) * Math.PI * r ** 3;
    case 'cone': return (Math.PI * r * r * h) / 3;
    case 'torus': { const t = h / 2, R = (w - h) / 2; return 2 * Math.PI ** 2 * R * t * t; }
    default: throw new Error(`unknown shape '${shape}'`);
  }
}

// quaternions are [x, y, z, w]
const qmul = ([ax, ay, az, aw], [bx, by, bz, bw]) => [
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
  aw * bw - ax * bx - ay * by - az * bz,
];
const qx = (a) => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
const qy = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];

export function createPhysics(J, { gravity = [0, 0, 0] } = {}) {
  // ---- the Jolt system: four object layers, two broad-phase layers -------------
  const settings = new J.JoltSettings();
  const pairs = new J.ObjectLayerPairFilterTable(4);
  pairs.EnableCollision(L_STATIC, L_MOVING);
  pairs.EnableCollision(L_MOVING, L_MOVING);
  pairs.EnableCollision(L_SENSOR, L_MOVING);
  pairs.EnableCollision(L_SENSOR, L_STATIC);
  pairs.EnableCollision(L_QUERY, L_STATIC); // rays see solid things only:
  pairs.EnableCollision(L_QUERY, L_MOVING); // never a sensor
  const bpi = new J.BroadPhaseLayerInterfaceTable(4, 2);
  bpi.MapObjectToBroadPhaseLayer(L_STATIC, new J.BroadPhaseLayer(0));
  for (const l of [L_MOVING, L_SENSOR, L_QUERY]) bpi.MapObjectToBroadPhaseLayer(l, new J.BroadPhaseLayer(1));
  settings.mObjectLayerPairFilter = pairs;
  settings.mBroadPhaseLayerInterface = bpi;
  settings.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 2, pairs, 4);
  const jolt = new J.JoltInterface(settings);
  J.destroy(settings);
  const system = jolt.GetPhysicsSystem();
  const bi = system.GetBodyInterface();
  const narrow = system.GetNarrowPhaseQuery();

  const setGravity = (g) => { const v = new J.Vec3(g[0], g[1], g[2]); system.SetGravity(v); J.destroy(v); };
  setGravity(gravity);
  let gravityNow = [...gravity];

  // ray query filters and a reusable collector
  const rayBp = new J.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), L_QUERY);
  const rayObj = new J.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), L_QUERY);
  const rayBody = new J.BodyFilter();
  const rayShape = new J.ShapeFilter();
  const rayCfg = new J.RayCastSettings();
  const closest = new J.CastRayClosestHitCollisionCollector();

  // ---- bookkeeping ---------------------------------------------------------------
  let nextId = 1;
  const byPtr = new Map();  // Jolt body pointer -> record (for contact callbacks, no allocation)
  const byKey = new Map();  // BodyID index+sequence -> record (for ray hits)
  const all = new Set();    // live records

  // ---- contacts: the touch verbs ---------------------------------------------------
  // Jolt calls the listener during Step. We collect the pairs seen this step, then
  // reconcile with last step's: new = began, gone = ended. A sleeping pair makes no
  // contacts, so a pair is carried over while both bodies are inactive.
  let seen = new Map();
  let touching = new Map();
  let endedPairs = new Map();
  const note = (p1, p2) => {
    const a = byPtr.get(p1), b = byPtr.get(p2);
    if (!a || !b) return;
    const lo = a.id < b.id ? a : b, hi = lo === a ? b : a;
    const k = lo.id * KEY + hi.id;
    if (!seen.has(k)) seen.set(k, { a: lo, b: hi, sensor: a.def.collider === 'none' || b.def.collider === 'none' });
  };
  const listener = new J.ContactListenerJS();
  listener.OnContactValidate = () => J.ValidateResult_AcceptAllContactsForThisBodyPair;
  listener.OnContactAdded = (p1, p2) => note(p1, p2);
  listener.OnContactPersisted = (p1, p2) => note(p1, p2);
  listener.OnContactRemoved = () => {};
  system.SetContactListener(listener);

  function reconcile() {
    const next = new Map();
    for (const [k, c] of seen) {
      const prev = touching.get(k);
      next.set(k, { a: c.a, b: c.b, sensor: c.sensor, frames: prev ? prev.frames + 1 : 1, began: !prev });
    }
    const ended = new Map();
    for (const [k, p] of touching) {
      if (seen.has(k)) continue;
      const bothAsleep = p.a.alive && p.b.alive && !p.a.body.IsActive() && !p.b.body.IsActive();
      if (bothAsleep) next.set(k, { ...p, frames: p.frames + 1, began: false });
      else ended.set(k, p);
    }
    touching = next;
    endedPairs = ended;
    seen = new Map();
  }

  // ---- building a body ---------------------------------------------------------------
  function makeShape(shape, w, h, d) {
    const r = w / 2;
    switch (shape) {
      case 'box': return new J.BoxShape(new J.Vec3(w / 2, h / 2, d / 2), Math.min(0.05, w / 4, h / 4, d / 4), null);
      case 'sphere': return new J.SphereShape(r);
      case 'cylinder': return new J.CylinderShape(h / 2, r, Math.min(0.05, r / 2, h / 4));
      case 'capsule': return new J.CapsuleShape(Math.max(h - w, 0) / 2, r);
      case 'cone': { // a tapered cylinder with a point on top; it needs a convex radius of 0
        const s = new J.TaperedCylinderShapeSettings(h / 2, 0, r, 0);
        const res = s.Create();
        if (!res.IsValid()) throw new Error('cone: ' + res.GetError().c_str());
        return res.Get();
      }
      case 'torus': {
        const tube = h / 2, ring = (w - h) / 2;
        const cs = new J.StaticCompoundShapeSettings();
        const half = ring * Math.sin(Math.PI / TORUS_SEGMENTS); // half a chord: the capsule's straight part
        for (let i = 0; i < TORUS_SEGMENTS; i++) {
          const t = (i / TORUS_SEGMENTS) * 2 * Math.PI;
          const q = qmul(qy(-t), qx(Math.PI / 2)); // lay a Y-axis capsule along the ring's tangent
          cs.AddShapeShape(new J.Vec3(ring * Math.cos(t), 0, ring * Math.sin(t)), new J.Quat(q[0], q[1], q[2], q[3]), new J.CapsuleShape(half, tube), 0);
        }
        const res = cs.Create();
        if (!res.IsValid()) throw new Error('torus: ' + res.GetError().c_str());
        return res.Get();
      }
      default: throw new Error(`unknown shape '${shape}'`);
    }
  }

  function allowedDofs(lock) {
    if (!lock) return J.EAllowedDOFs_All;
    const l = lock === true ? { x: true, y: true, z: true } : lock;
    let f = J.EAllowedDOFs_TranslationX | J.EAllowedDOFs_TranslationY | J.EAllowedDOFs_TranslationZ;
    if (!l.x) f |= J.EAllowedDOFs_RotationX;
    if (!l.y) f |= J.EAllowedDOFs_RotationY;
    if (!l.z) f |= J.EAllowedDOFs_RotationZ;
    return f;
  }

  function build(rec, pose) {
    const d = rec.def;
    const collider = d.collider;
    const shape = makeShape(d.shape, d.w, d.h, d.d);
    const moving = collider !== 'static';
    const motion = collider === 'dynamic' ? J.EMotionType_Dynamic : collider === 'static' ? J.EMotionType_Static : J.EMotionType_Kinematic;
    const layer = collider === 'static' ? L_STATIC : collider === 'none' ? L_SENSOR : L_MOVING;
    const pos = new J.RVec3(pose.pos[0], pose.pos[1], pose.pos[2]);
    const rot = new J.Quat(pose.quat[0], pose.quat[1], pose.quat[2], pose.quat[3]);
    const cs = new J.BodyCreationSettings(shape, pos, rot, motion, layer);
    cs.set_mFriction(d.friction);
    cs.set_mRestitution(d.bounciness);
    cs.set_mUserData(rec.id);
    cs.set_mAllowSleeping(true);
    if (collider === 'none') { cs.set_mIsSensor(true); cs.set_mCollideKinematicVsNonDynamic(true); }
    if (collider === 'dynamic') {
      cs.set_mAllowedDOFs(allowedDofs(d.lockRotation));
      const mp = new J.MassProperties();
      mp.set_mMass(Math.max(d.mass ?? d.density * volumeOf(d.shape, d.w, d.h, d.d), 1e-4));
      cs.set_mOverrideMassProperties(J.EOverrideMassProperties_CalculateInertia);
      cs.set_mMassPropertiesOverride(mp);
      J.destroy(mp);
    }
    const body = bi.CreateBody(cs);
    J.destroy(cs); J.destroy(pos); J.destroy(rot);
    rec.body = body;
    rec.bodyId = body.GetID();
    rec.key = rec.bodyId.GetIndexAndSequenceNumber();
    rec.ptr = J.getPointer(body);
    bi.AddBody(rec.bodyId, moving ? J.EActivation_Activate : J.EActivation_DontActivate);
    byPtr.set(rec.ptr, rec);
    byKey.set(rec.key, rec);
  }

  function unbuild(rec) {
    byPtr.delete(rec.ptr);
    byKey.delete(rec.key);
    bi.RemoveBody(rec.bodyId);
    bi.DestroyBody(rec.bodyId);
    rec.body = null;
  }

  // ---- reading and writing a body ---------------------------------------------------
  const v3 = (v) => [v.GetX(), v.GetY(), v.GetZ()];
  function pose(rec) {
    const p = rec.body.GetPosition(), q = rec.body.GetRotation();
    return { pos: [p.GetX(), p.GetY(), p.GetZ()], quat: [q.GetX(), q.GetY(), q.GetZ(), q.GetW()] };
  }
  function withVec(a, fn) { const v = new J.Vec3(a[0], a[1], a[2]); try { return fn(v); } finally { J.destroy(v); } }

  const world = {
    /** Make a body. `def` fields: shape, w, h, d, collider, friction, bounciness, density,
     *  mass (optional override), lockRotation, pos [x,y,z], quat [x,y,z,w], vel, angVel, userData. */
    createBody(def) {
      if (!SHAPES.includes(def.shape)) throw new Error(`unknown shape '${def.shape}'`);
      if (!COLLIDERS.includes(def.collider)) throw new Error(`unknown collider '${def.collider}'`);
      const rec = { id: nextId++, alive: true, userData: def.userData, def: {
        shape: def.shape, w: def.w ?? 1, h: def.h ?? 1, d: def.d ?? 1, collider: def.collider,
        friction: def.friction ?? 0, bounciness: def.bounciness ?? 0, density: def.density ?? 1,
        mass: def.mass ?? null, lockRotation: def.lockRotation ?? false } };
      build(rec, { pos: def.pos ?? [0, 0, 0], quat: def.quat ?? [0, 0, 0, 1] });
      all.add(rec);
      if (def.vel) world.setVelocity(rec, def.vel);
      if (def.angVel) world.setAngularVelocity(rec, def.angVel);
      return rec;
    },
    removeBody(rec) {
      if (!rec.alive) return;
      unbuild(rec);
      rec.alive = false;
      all.delete(rec);
    },
    /** Change what a body is made of (size, shape, collider, mass...) keeping its pose and speed. */
    rebuild(rec, patch) {
      const p = pose(rec), vel = world.getVelocity(rec), ang = world.getAngularVelocity(rec);
      unbuild(rec);
      Object.assign(rec.def, patch);
      build(rec, p);
      world.setVelocity(rec, vel);
      world.setAngularVelocity(rec, ang);
    },
    /** Live material changes: no rebuild, so a sketch may set these every frame. */
    setFriction(rec, f) { rec.def.friction = f; bi.SetFriction(rec.bodyId, f); },
    setBounciness(rec, r) { rec.def.bounciness = r; bi.SetRestitution(rec.bodyId, r); },
    get allowSleeping() { return system.GetPhysicsSettings().get_mAllowSleeping(); },
    set allowSleeping(on) {
      const s = system.GetPhysicsSettings();
      s.set_mAllowSleeping(!!on);
      system.SetPhysicsSettings(s);
      if (!on) for (const rec of all) if (rec.def.collider === 'dynamic') bi.ActivateBody(rec.bodyId);
    },
    getPose: pose,
    setPose(rec, pos, quat) {
      const p = new J.RVec3(pos[0], pos[1], pos[2]), q = new J.Quat(quat[0], quat[1], quat[2], quat[3]);
      bi.SetPositionAndRotation(rec.bodyId, p, q, rec.def.collider === 'static' ? J.EActivation_DontActivate : J.EActivation_Activate);
      J.destroy(p); J.destroy(q);
    },
    getVelocity: (rec) => v3(bi.GetLinearVelocity(rec.bodyId)),
    setVelocity(rec, v) { if (rec.def.collider !== 'static') withVec(v, (x) => bi.SetLinearVelocity(rec.bodyId, x)); },
    getAngularVelocity: (rec) => v3(bi.GetAngularVelocity(rec.bodyId)),
    setAngularVelocity(rec, v) { if (rec.def.collider !== 'static') withVec(v, (x) => bi.SetAngularVelocity(rec.bodyId, x)); },
    addForce(rec, f) { withVec(f, (x) => bi.AddForce(rec.bodyId, x)); },
    addImpulse(rec, i) { withVec(i, (x) => bi.AddImpulse(rec.bodyId, x)); },
    addTorque(rec, t) { withVec(t, (x) => bi.AddTorque(rec.bodyId, x)); },
    /** Real mass in kg as Jolt has it (0 for static, kinematic and sensors). */
    massOf(rec) {
      if (rec.def.collider !== 'dynamic') return 0; // only dynamic bodies have a finite mass
      const inv = rec.body.GetMotionProperties().GetInverseMass();
      return inv > 0 ? 1 / inv : 0;
    },
    isAwake: (rec) => rec.body.IsActive(),
    isAlive: (rec) => rec.alive,

    get gravity() { return [...gravityNow]; },
    set gravity(g) {
      gravityNow = [g[0], g[1], g[2]];
      setGravity(gravityNow);
      // Jolt does not wake sleeping bodies when gravity changes, so a ball that sat still
      // at gravity 0 would hang there after world.gravity.y = -10.
      for (const rec of all) if (rec.def.collider === 'dynamic') bi.ActivateBody(rec.bodyId);
    },

    /** Advance one fixed step and update the touch table. */
    step() { jolt.Step(FIXED_DT, 1); reconcile(); },

    /** How two records touch right now, or null. `physical` is true when solid bodies
     *  touch; a sensor contact (collider 'none') is an overlap only. */
    touching(a, b) {
      const lo = a.id < b.id ? a : b, hi = lo === a ? b : a;
      const k = lo.id * KEY + hi.id;
      const t = touching.get(k);
      if (t) return { frames: t.frames, began: t.began, ended: false, physical: !t.sensor };
      const e = endedPairs.get(k);
      return e ? { frames: 0, began: false, ended: true, physical: !e.sensor } : null;
    },
    /** Every record `rec` touches right now. */
    touchingAll(rec) {
      const out = [];
      for (const t of touching.values()) {
        if (t.a === rec) out.push({ other: t.b, frames: t.frames, began: t.began, physical: !t.sensor });
        else if (t.b === rec) out.push({ other: t.a, frames: t.frames, began: t.began, physical: !t.sensor });
      }
      return out;
    },

    /** Closest SOLID body on the line from `from` to `to` ([x,y,z]); sensors are looked through. */
    rayCast(from, to) {
      const dir = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
      const o = new J.RVec3(from[0], from[1], from[2]), dv = new J.Vec3(dir[0], dir[1], dir[2]);
      const ray = new J.RRayCast(o, dv);
      closest.Reset();
      narrow.CastRay(ray, rayCfg, closest, rayBp, rayObj, rayBody, rayShape);
      J.destroy(ray); J.destroy(o); J.destroy(dv);
      if (!closest.HadHit()) return null;
      const hit = closest.get_mHit();
      return hitOf(from, dir, byKey.get(hit.get_mBodyID().GetIndexAndSequenceNumber()), hit.get_mFraction(), hit.get_mSubShapeID2().GetValue());
    },
    /** Every solid body along the line, nearest first. */
    rayCastAll(from, to) {
      const dir = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
      const hits = [];
      const col = new J.CastRayCollectorJS();
      col.OnBody = () => {};
      col.AddHit = (ptr) => {
        const r = J.wrapPointer(ptr, J.RayCastResult);
        hits.push({ key: r.get_mBodyID().GetIndexAndSequenceNumber(), f: r.get_mFraction(), sub: r.get_mSubShapeID2().GetValue() });
      };
      const o = new J.RVec3(from[0], from[1], from[2]), dv = new J.Vec3(dir[0], dir[1], dir[2]);
      const ray = new J.RRayCast(o, dv);
      narrow.CastRay(ray, rayCfg, col, rayBp, rayObj, rayBody, rayShape);
      J.destroy(ray); J.destroy(o); J.destroy(dv); J.destroy(col);
      hits.sort((a, b) => a.f - b.f);
      return hits.map((h) => hitOf(from, dir, byKey.get(h.key), h.f, h.sub)).filter(Boolean);
    },

    /** An instant outward push: `magnitude` is the speed given at the centre, fading to
     *  `falloff` of it at `radius`. Scaled by mass, so heavy things are pushed as fast as light ones. */
    explodeAt(center, radius, magnitude, falloff = 0) {
      for (const rec of all) {
        if (rec.def.collider !== 'dynamic') continue;
        const p = pose(rec).pos;
        const d = [p[0] - center[0], p[1] - center[1], p[2] - center[2]];
        const dist = Math.hypot(d[0], d[1], d[2]);
        if (dist > radius) continue;
        const dir = dist < 1e-6 ? [0, 1, 0] : [d[0] / dist, d[1] / dist, d[2] / dist];
        const k = magnitude * (1 - (1 - falloff) * (dist / radius)) * world.massOf(rec);
        world.addImpulse(rec, [dir[0] * k, dir[1] * k, dir[2] * k]);
      }
    },

    get bodyCount() { return all.size; },
    bodies: () => all,
    dispose() {
      for (const rec of [...all]) world.removeBody(rec);
      J.destroy(jolt);
    },
  };

  function hitOf(from, dir, rec, fraction, subValue) {
    if (!rec) return null;
    const point = [from[0] + dir[0] * fraction, from[1] + dir[1] * fraction, from[2] + dir[2] * fraction];
    const sid = new J.SubShapeID(); sid.SetValue(subValue);
    const pr = new J.RVec3(point[0], point[1], point[2]);
    const n = v3(rec.body.GetWorldSpaceSurfaceNormal(sid, pr));
    J.destroy(sid); J.destroy(pr);
    return { rec, point, normal: n, fraction };
  }

  return world;
}
