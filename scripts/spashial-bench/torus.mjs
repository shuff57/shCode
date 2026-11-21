// Can a torus have a real collider? Jolt has no torus primitive, so build one:
// a ring of N capsules (a compound shape) along the major circle. Tests:
//   A. a ball SMALLER than the hole falls through it, a ball LARGER rests on top
//   B. a dynamic torus dropped tilted onto a floor settles flat at the right height
//   C. what it costs per step, against the same number of plain spheres
// Run: node torus.mjs
import { performance } from 'node:perf_hooks';
import init from 'jolt-physics';

const J = await init();
const DT = 1 / 60;
const L_STATIC = 0, L_MOVING = 1;

function makeWorld() {
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
  system.SetGravity(new J.Vec3(0, -10, 0));
  const bi = system.GetBodyInterface();
  const add = (shape, x, y, z, moving, quat = [0, 0, 0, 1]) => {
    const cs = new J.BodyCreationSettings(
      shape, new J.RVec3(x, y, z), new J.Quat(...quat),
      moving ? J.EMotionType_Dynamic : J.EMotionType_Static, moving ? L_MOVING : L_STATIC);
    cs.mFriction = 0.6; cs.mRestitution = 0; cs.mAllowSleeping = false;
    const body = bi.CreateBody(cs);
    J.destroy(cs);
    bi.AddBody(body.GetID(), moving ? J.EActivation_Activate : J.EActivation_DontActivate);
    return body;
  };
  return { jolt, add, step: () => jolt.Step(DT, 1), dispose: () => J.destroy(jolt) };
}

// quaternions as [x, y, z, w]
const qmul = ([ax, ay, az, aw], [bx, by, bz, bw]) => [
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
  aw * bw - ax * bx - ay * by - az * bz,
];
const qx = (a) => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
const qy = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];

/** A torus lying flat (axis = Y): major radius R, tube radius r, n capsules. */
function torusShape(R, r, n) {
  const settings = new J.StaticCompoundShapeSettings();
  const half = R * Math.sin(Math.PI / n); // half the chord: the capsule's straight part
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    // a capsule's axis is Y; lay it along the tangent (-sin t, 0, cos t)
    const q = qmul(qy(-t), qx(Math.PI / 2));
    settings.AddShapeShape(new J.Vec3(R * Math.cos(t), 0, R * Math.sin(t)), new J.Quat(...q), new J.CapsuleShape(half, r), 0);
  }
  const res = settings.Create();
  if (!res.IsValid()) throw new Error('torus shape: ' + res.GetError().c_str());
  return res.Get();
}

const pos = (b) => { const p = b.GetPosition(); return [p.GetX(), p.GetY(), p.GetZ()]; };
// The world-space Y component of the body's own Y axis: 1 means it lies flat.
const upAxisY = (b) => { const q = b.GetRotation(); return 1 - 2 * (q.GetX() ** 2 + q.GetZ() ** 2); };
const fixed = (v, d = 3) => +v.toFixed(d);

const R = 1.0, r = 0.3, N = 16;
console.log(`torus R=${R} (ring) r=${r} (tube), ${N} capsules. Hole radius ${(R - r).toFixed(2)}.`);
console.log(`ring approximation error (sagitta) for N=12/16/24: ${[12, 16, 24].map((n) => (R * (1 - Math.cos(Math.PI / n))).toFixed(4)).join(' / ')} (m, of R=${R})\n`);

// ---- A: hole and rim -----------------------------------------------------------
{
  const w = makeWorld();
  w.add(new J.BoxShape(new J.Vec3(20, 0.5, 20), 0.05, null), 0, -0.5, 0, false); // floor, top at y=0
  w.add(torusShape(R, r, N), 0, 2, 0, false);                                     // a static ring at y=2
  const small = w.add(new J.SphereShape(0.5), 0.0, 6, 0.0, true);   // fits the 0.7 hole
  for (let i = 0; i < 300; i++) w.step();
  console.log('A1. ball r=0.5 (fits the hole) dropped through a ring at y=2:');
  console.log(`    final y = ${fixed(pos(small)[1])}  (floor contact at 0.5 means it fell through)  ${pos(small)[1] < 0.6 ? 'PASS' : 'FAIL'}`);
  w.dispose();
}
{
  const w = makeWorld();
  w.add(new J.BoxShape(new J.Vec3(20, 0.5, 20), 0.05, null), 0, -0.5, 0, false);
  w.add(torusShape(R, r, N), 0, 2, 0, false);
  const big = w.add(new J.SphereShape(0.9), 0.0, 6, 0.0, true);
  for (let i = 0; i < 300; i++) w.step();
  const expected = 2 + Math.sqrt((r + 0.9) ** 2 - R ** 2); // analytic: sphere touching the tube circle
  console.log('A2. ball r=0.9 (too big for the hole) dropped onto the ring:');
  console.log(`    rests at y = ${fixed(pos(big)[1])}, analytic ${fixed(expected)} for a true torus  ${Math.abs(pos(big)[1] - expected) < 0.05 ? 'PASS' : 'FAIL'}`);
  w.dispose();
}

// ---- B: dynamic torus settles flat ---------------------------------------------
{
  const w = makeWorld();
  w.add(new J.BoxShape(new J.Vec3(20, 0.5, 20), 0.05, null), 0, -0.5, 0, false);
  const tilt = qmul(qx(0.5), qy(0.3));
  const t = w.add(torusShape(R, r, N), 0, 3, 0, true, tilt);
  for (let i = 0; i < 360; i++) w.step();
  const v = t.GetLinearVelocity();
  const speed = Math.hypot(v.GetX(), v.GetY(), v.GetZ());
  console.log('B.  dynamic torus dropped tilted (~29 deg) from y=3, after 6 s:');
  console.log(`    centre y = ${fixed(pos(t)[1])} (flat on the floor is ${r}), axis vertical = ${fixed(upAxisY(t), 4)} (1 = flat), speed ${fixed(speed)}  ${Math.abs(pos(t)[1] - r) < 0.03 && upAxisY(t) > 0.999 ? 'PASS' : 'FAIL'}`);
  w.dispose();
}

// ---- C: cost -----------------------------------------------------------------------
function cost(label, make, count) {
  const w = makeWorld();
  w.add(new J.BoxShape(new J.Vec3(14, 0.5, 14), 0.05, null), 0, -0.5, 0, false);
  w.add(new J.BoxShape(new J.Vec3(0.5, 4.5, 13), 0.05, null), 12.5, 4, 0, false);
  w.add(new J.BoxShape(new J.Vec3(0.5, 4.5, 13), 0.05, null), -12.5, 4, 0, false);
  w.add(new J.BoxShape(new J.Vec3(13, 4.5, 0.5), 0.05, null), 0, 4, 12.5, false);
  w.add(new J.BoxShape(new J.Vec3(13, 4.5, 0.5), 0.05, null), 0, 4, -12.5, false);
  const shape = make();
  for (let i = 0; i < count; i++) {
    const ix = i % 10, iz = Math.floor(i / 10) % 10, layer = Math.floor(i / 100);
    w.add(shape, (ix - 4.5) * 2.6, 2 + layer * 2.2, (iz - 4.5) * 2.6, true, qmul(qx(0.4 + 0.1 * (i % 7)), qy(0.2 * (i % 5))));
  }
  const ms = [];
  for (let i = 0; i < 300; i++) { const t = performance.now(); w.step(); ms.push(performance.now() - t); }
  w.dispose();
  const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
  console.log(`    ${label.padEnd(34)} mean ${mean.toFixed(2)} ms/step`);
  return mean;
}
console.log('C.  cost, 300 steps, 200 bodies dropped into a bin:');
const base = cost('200 spheres (baseline)', () => new J.SphereShape(0.5), 200);
for (const n of [12, 16, 24]) cost(`200 tori, ${n} capsules each`, () => torusShape(R, r, n), 200);
console.log(`    (a cheap body is ${base.toFixed(2)} ms for 200; a torus is a compound of many shapes)`);
