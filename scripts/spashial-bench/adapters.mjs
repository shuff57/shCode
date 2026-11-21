// One adapter per physics library, same tiny interface, so bench.mjs runs the
// identical scene through each. Units are metres, Y up, gravity -10, friction
// 0.6, restitution 0, one fixed 1/60 step. Nothing here is tuned per library.
//
//   const w = await adapter.create({ sleep });
//   w.staticBox(cx, cy, cz, hx, hy, hz)            -> handle
//   w.box(x, y, z, hx, hy, hz)                     -> handle (dynamic)
//   w.sphere(x, y, z, r)                           -> handle (dynamic)
//   w.step()                                       advances 1/60 s
//   w.pos(handle)                                  -> [x, y, z]
//   w.rayDown(x, z)                                -> y of the closest hit, or null
//   w.onContact(fn)                                counts contact-begin events
//   w.dispose()

export const DT = 1 / 60;
export const GRAVITY = -10;
export const FRICTION = 0.6;

// ---------------------------------------------------------------- Rapier
export const rapier = {
  name: 'rapier 0.21',
  async create({ sleep }) {
    const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 });
    let events = null;
    let cb = null;
    const bodies = [];
    const colliderOf = (desc, body, events) => {
      desc.setFriction(FRICTION).setRestitution(0);
      if (events) desc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      world.createCollider(desc, body);
    };
    return {
      staticBox(cx, cy, cz, hx, hy, hz) {
        const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
        colliderOf(RAPIER.ColliderDesc.cuboid(hx, hy, hz), b, !!cb);
        return b;
      },
      box(x, y, z, hx, hy, hz) {
        const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCanSleep(sleep));
        colliderOf(RAPIER.ColliderDesc.cuboid(hx, hy, hz), b, !!cb);
        bodies.push(b);
        return b;
      },
      sphere(x, y, z, r) {
        const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCanSleep(sleep));
        colliderOf(RAPIER.ColliderDesc.ball(r), b, !!cb);
        bodies.push(b);
        return b;
      },
      onContact(fn) { cb = fn; events = new RAPIER.EventQueue(true); },
      step() {
        if (events) {
          world.step(events);
          events.drainCollisionEvents((_h1, _h2, started) => { if (started) cb(); });
        } else world.step();
      },
      pos(b) { const t = b.translation(); return [t.x, t.y, t.z]; },
      rayDown(x, z) {
        const hit = world.castRay(new RAPIER.Ray({ x, y: 30, z }, { x: 0, y: -1, z: 0 }), 40, true);
        return hit ? 30 - hit.timeOfImpact : null;
      },
      dispose() { world.free(); },
    };
  },
};

// ------------------------------------------------------------ cannon-es
export const cannon = {
  name: 'cannon-es 0.20',
  async create({ sleep }) {
    const C = await import('cannon-es');
    const world = new C.World({ gravity: new C.Vec3(0, GRAVITY, 0) });
    world.broadphase = new C.SAPBroadphase(world); // the recommended one past a few dozen bodies
    world.allowSleep = sleep;
    world.defaultContactMaterial.friction = FRICTION;
    world.defaultContactMaterial.restitution = 0;
    let cb = null;
    const make = (shape, x, y, z, mass) => {
      const b = new C.Body({ mass, shape, position: new C.Vec3(x, y, z) });
      if (cb && mass > 0) b.addEventListener('collide', cb);
      world.addBody(b);
      return b;
    };
    return {
      staticBox: (cx, cy, cz, hx, hy, hz) => make(new C.Box(new C.Vec3(hx, hy, hz)), cx, cy, cz, 0),
      box: (x, y, z, hx, hy, hz) => make(new C.Box(new C.Vec3(hx, hy, hz)), x, y, z, 1),
      sphere: (x, y, z, r) => make(new C.Sphere(r), x, y, z, 1),
      onContact(fn) { cb = fn; },
      step() { world.step(DT); },
      pos(b) { return [b.position.x, b.position.y, b.position.z]; },
      rayDown(x, z) {
        const res = new C.RaycastResult();
        const hit = world.raycastClosest(new C.Vec3(x, 30, z), new C.Vec3(x, -10, z), {}, res);
        return hit ? res.hitPointWorld.y : null;
      },
      dispose() {},
    };
  },
};

// ------------------------------------------------------------------ Jolt
const L_STATIC = 0;
const L_MOVING = 1;

export const jolt = {
  name: 'jolt 1.1.1 (wasm-compat)',
  async create({ sleep }) {
    const init = (await import('jolt-physics')).default;
    const J = await init();
    const settings = new J.JoltSettings();
    const pairs = new J.ObjectLayerPairFilterTable(2);
    pairs.EnableCollision(L_STATIC, L_MOVING);
    pairs.EnableCollision(L_MOVING, L_MOVING);
    const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2);
    bpi.MapObjectToBroadPhaseLayer(L_STATIC, new J.BroadPhaseLayer(0));
    bpi.MapObjectToBroadPhaseLayer(L_MOVING, new J.BroadPhaseLayer(1));
    settings.mObjectLayerPairFilter = pairs;
    settings.mBroadPhaseLayerInterface = bpi;
    settings.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 2, pairs, 2);
    const jolt = new J.JoltInterface(settings);
    J.destroy(settings);
    const system = jolt.GetPhysicsSystem();
    const bi = system.GetBodyInterface();
    system.SetGravity(new J.Vec3(0, GRAVITY, 0));
    let listener = null;

    const make = (shape, x, y, z, moving) => {
      const cs = new J.BodyCreationSettings(
        shape,
        new J.RVec3(x, y, z),
        new J.Quat(0, 0, 0, 1),
        moving ? J.EMotionType_Dynamic : J.EMotionType_Static,
        moving ? L_MOVING : L_STATIC,
      );
      cs.mFriction = FRICTION;
      cs.mRestitution = 0;
      cs.mAllowSleeping = moving ? sleep : true;
      const body = bi.CreateBody(cs);
      J.destroy(cs);
      bi.AddBody(body.GetID(), moving ? J.EActivation_Activate : J.EActivation_DontActivate);
      return body;
    };

    return {
      staticBox: (cx, cy, cz, hx, hy, hz) => make(new J.BoxShape(new J.Vec3(hx, hy, hz), 0.05, null), cx, cy, cz, false),
      box: (x, y, z, hx, hy, hz) => make(new J.BoxShape(new J.Vec3(hx, hy, hz), 0.05, null), x, y, z, true),
      sphere: (x, y, z, r) => make(new J.SphereShape(r, null), x, y, z, true),
      onContact(fn) {
        listener = new J.ContactListenerJS();
        listener.OnContactValidate = () => J.ValidateResult_AcceptAllContactsForThisBodyPair;
        listener.OnContactAdded = () => { fn(); };
        listener.OnContactPersisted = () => {};
        listener.OnContactRemoved = () => {};
        system.SetContactListener(listener);
      },
      step() { jolt.Step(DT, 1); },
      pos(b) { const p = b.GetPosition(); return [p.GetX(), p.GetY(), p.GetZ()]; },
      rayDown: (() => {
        const nq = system.GetNarrowPhaseQuery();
        const bp = new J.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), L_MOVING);
        const ol = new J.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), L_MOVING);
        const bf = new J.BodyFilter();
        const sf = new J.ShapeFilter();
        const rs = new J.RayCastSettings();
        const col = new J.CastRayClosestHitCollisionCollector();
        return (x, z) => {
          col.Reset();
          nq.CastRay(new J.RRayCast(new J.RVec3(x, 30, z), new J.Vec3(0, -40, 0)), rs, col, bp, ol, bf, sf);
          return col.HadHit() ? 30 - 40 * col.get_mHit().mFraction : null;
        };
      })(),
      dispose() { J.destroy(jolt); },
    };
  },
};

export const ADAPTERS = [rapier, cannon, jolt];
