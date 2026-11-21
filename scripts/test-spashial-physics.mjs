// Tests for public/spashial/physics.js, the Jolt layer. Runs in Node: no browser, no GPU.
//   node scripts/test-spashial-physics.mjs
import init from 'jolt-physics';
import { createPhysics, FIXED_DT, SHAPES, volumeOf } from '../public/spashial/physics.js';

const J = await init();
let pass = 0, fail = 0;
const ok = (cond, name, detail = '') => {
  if (cond) pass++; else { fail++; console.log(`FAIL  ${name}${detail ? '  ' + detail : ''}`); }
};
const near = (a, b, tol, name) => ok(Math.abs(a - b) <= tol, name, `got ${a}, want ${b} +/- ${tol}`);
const run = (w, n) => { for (let i = 0; i < n; i++) w.step(); };
const fresh = (gravity = [0, -10, 0]) => {
  const w = createPhysics(J, { gravity });
  const floor = w.createBody({ shape: 'box', w: 40, h: 1, d: 40, collider: 'static', pos: [0, -0.5, 0], friction: 0.6 });
  return { w, floor };
};

// 1. a box falls and comes to rest on the floor
{
  const { w } = fresh();
  const b = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [0, 3, 0], friction: 0.6 });
  run(w, 180);
  near(w.getPose(b).pos[1], 0.5, 0.06, 'box rests on the floor at y = 0.5');
  near(Math.hypot(...w.getVelocity(b)), 0, 0.05, 'box is at rest');
  w.dispose();
}

// 2. every shape falls to the floor and rests at its own half-height
{
  const want = { box: 0.5, sphere: 0.5, cylinder: 0.5, capsule: 0.5, cone: 0.5, torus: 0.2 };
  for (const shape of SHAPES) {
    const { w } = fresh();
    const dims = shape === 'torus' ? { w: 1.2, h: 0.4, d: 1 } : { w: 1, h: 1, d: 1 };
    const b = w.createBody({ shape, ...dims, collider: 'dynamic', pos: [0, 2, 0], friction: 0.6 });
    run(w, 240);
    near(w.getPose(b).pos[1], want[shape], 0.07, `${shape} rests at y = ${want[shape]}`);
    w.dispose();
  }
}

// 3. the touch table: began once, frames count up, ended once after leaving
{
  const { w, floor } = fresh();
  const b = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [0, 1.5, 0] });
  let began = 0, maxFrames = 0, sawPhysical = false;
  for (let i = 0; i < 120; i++) {
    w.step();
    const t = w.touching(b, floor);
    if (t) { if (t.began) began++; maxFrames = Math.max(maxFrames, t.frames); sawPhysical ||= t.physical; }
  }
  ok(began === 1, 'collision begins exactly once', `began ${began} times`);
  ok(maxFrames > 60, 'frames keep counting while touching', `max ${maxFrames}`);
  ok(sawPhysical, 'a solid contact is physical');
  w.setPose(b, [0, 5, 0], [0, 0, 0, 1]);
  w.setVelocity(b, [0, 0, 0]);
  w.step();
  const e = w.touching(b, floor);
  ok(e && e.ended && e.frames === 0, 'the step after leaving reports ended');
  w.step();
  ok(w.touching(b, floor) === null, 'and the step after that reports nothing');
  w.dispose();
}

// 4. a sensor ('none') reports an overlap but does not stop anything
{
  const { w } = fresh();
  const zone = w.createBody({ shape: 'box', w: 4, h: 1, d: 4, collider: 'none', pos: [0, 2, 0] });
  const ball = w.createBody({ shape: 'sphere', w: 0.5, collider: 'dynamic', pos: [0, 4, 0], friction: 0.6 });
  let overlapFrames = 0, everPhysical = false;
  for (let i = 0; i < 180; i++) {
    w.step();
    const t = w.touching(ball, zone);
    if (t && !t.ended) { overlapFrames++; everPhysical ||= t.physical; }
  }
  ok(overlapFrames > 5, 'the ball overlaps the zone while falling through it', `${overlapFrames} frames`);
  ok(!everPhysical, 'a sensor contact is never physical');
  near(w.getPose(ball).pos[1], 0.25, 0.06, 'the ball fell straight through to the floor');
  w.dispose();
}

// 5. ray casts: closest solid hit, correct normal, sensors are looked through
{
  const { w } = fresh();
  w.createBody({ shape: 'box', w: 4, h: 1, d: 4, collider: 'none', pos: [0, 5, 0] }); // sensor in the way
  const crate = w.createBody({ shape: 'box', w: 2, h: 2, d: 2, collider: 'static', pos: [0, 2, 0] });
  const hit = w.rayCast([0, 10, 0], [0, -10, 0]);
  ok(hit && hit.rec === crate, 'the ray hits the crate, not the sensor above it');
  near(hit?.point[1] ?? NaN, 3, 0.001, 'hit point is the crate top');
  near(hit?.normal[1] ?? NaN, 1, 0.001, 'normal points up');
  near(hit?.fraction ?? NaN, 0.35, 0.001, 'fraction is 0.35 along the line');
  ok(w.rayCast([20, 10, 0], [20, -10, 0])?.rec.def.collider === 'static', 'a ray beside the crate hits the floor');
  ok(w.rayCast([0, 10, 100], [0, -10, 100]) === null, 'a ray past everything hits nothing');
  const all = w.rayCastAll([0, 10, 0], [0, -10, 0]);
  ok(all.length === 2 && all[0].rec === crate && all[1].rec.def.shape === 'box', 'rayCastAll lists crate then floor, nearest first', `${all.length} hits`);
  w.dispose();
}

// 6. mass and impulses: v = impulse / mass
{
  const { w } = fresh([0, 0, 0]);
  const b = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [0, 5, 0], density: 2 });
  near(w.massOf(b), 2, 0.001, 'a 1 m cube at density 2 weighs 2 kg');
  near(volumeOf('sphere', 2, 2, 2), (4 / 3) * Math.PI, 1e-9, 'sphere volume');
  w.addImpulse(b, [0, 4, 0]);
  w.step();
  near(w.getVelocity(b)[1], 2, 0.01, 'impulse 4 on 2 kg gives 2 m/s');
  const heavy = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [5, 5, 0], mass: 10 });
  near(w.massOf(heavy), 10, 0.001, 'an explicit mass wins over density');
  w.dispose();
}

// 7. lockRotation keeps a body upright; without it the same push spins it
{
  const { w } = fresh([0, 0, 0]);
  const locked = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [0, 5, 0], lockRotation: true });
  const free = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [5, 5, 0] });
  for (const b of [locked, free]) w.addTorque(b, [0, 0, 50]);
  run(w, 30);
  near(Math.hypot(...w.getAngularVelocity(locked)), 0, 1e-3, 'a locked body does not spin');
  ok(Math.hypot(...w.getAngularVelocity(free)) > 0.5, 'a free body does spin');
  w.dispose();
}

// 8. rebuild keeps pose and speed while changing size
{
  const { w } = fresh([0, 0, 0]);
  const b = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [1, 2, 3] });
  w.setVelocity(b, [1, 0, 0]);
  w.rebuild(b, { w: 2, h: 2, d: 2 });
  const p = w.getPose(b).pos, v = w.getVelocity(b);
  near(p[0], 1, 1e-6, 'x kept'); near(p[1], 2, 1e-6, 'y kept'); near(p[2], 3, 1e-6, 'z kept'); near(v[0], 1, 1e-6, 'speed kept');
  near(w.massOf(b), 8, 0.001, 'a doubled cube is eight times the mass');
  w.dispose();
}

// 9. kinematic bodies move by their velocity and push dynamic ones; removed bodies vanish
{
  const { w } = fresh([0, 0, 0]);
  const mover = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'kinematic', pos: [0, 1, 0] });
  const crate = w.createBody({ shape: 'box', w: 1, h: 1, d: 1, collider: 'dynamic', pos: [2, 1, 0] });
  w.setVelocity(mover, [2, 0, 0]);
  run(w, 90);
  near(w.getPose(mover).pos[0], 3, 0.05, 'a kinematic body moves at its velocity (2 m/s for 1.5 s)');
  ok(w.getPose(crate).pos[0] > 3.5, 'and pushes a dynamic body ahead of it');
  w.removeBody(crate);
  ok(!w.isAlive(crate) && w.bodyCount === 2, 'a removed body is gone');
  ok(w.rayCast([w.getPose(mover).pos[0], 10, 0], [w.getPose(mover).pos[0], -10, 0])?.rec === mover, 'rays no longer see a removed body');
  w.dispose();
}

// 10. explodeAt pushes away, harder near the centre, same speed whatever the mass
{
  const { w } = fresh([0, 0, 0]);
  const near1 = w.createBody({ shape: 'sphere', w: 1, collider: 'dynamic', pos: [1, 0, 0] });
  const heavy = w.createBody({ shape: 'sphere', w: 1, collider: 'dynamic', pos: [-1, 0, 0], mass: 50 });
  const far = w.createBody({ shape: 'sphere', w: 1, collider: 'dynamic', pos: [0, 0, 4.5] });
  const outside = w.createBody({ shape: 'sphere', w: 1, collider: 'dynamic', pos: [0, 0, 20] });
  w.explodeAt([0, 0, 0], 5, 10, 0.2);
  w.step();
  ok(w.getVelocity(near1)[0] > 7, 'a body 1 m away is pushed outward', `vx ${w.getVelocity(near1)[0]}`);
  near(Math.abs(w.getVelocity(heavy)[0]), Math.abs(w.getVelocity(near1)[0]), 0.1, 'a 50 kg body leaves as fast as a light one');
  ok(w.getVelocity(far)[2] > 0 && w.getVelocity(far)[2] < w.getVelocity(near1)[0], 'a far body is pushed less');
  near(Math.hypot(...w.getVelocity(outside)), 0, 1e-6, 'a body outside the radius is untouched');
  w.dispose();
}

// 11. gravity can be read and changed
{
  const { w } = fresh([0, 0, 0]);
  const b = w.createBody({ shape: 'sphere', w: 1, collider: 'dynamic', pos: [0, 10, 0] });
  run(w, 30);
  near(w.getPose(b).pos[1], 10, 1e-6, 'nothing falls at gravity 0');
  w.gravity = [0, -10, 0];
  ok(w.gravity[1] === -10, 'gravity reads back');
  run(w, 30);
  ok(w.getPose(b).pos[1] < 9.9, 'and then it falls');
  w.dispose();
}

// 12. bad input fails loudly, in plain words
{
  const w = createPhysics(J);
  let msg = '';
  try { w.createBody({ shape: 'pyramid', collider: 'dynamic' }); } catch (e) { msg = e.message; }
  ok(/unknown shape 'pyramid'/.test(msg), 'an unknown shape throws a clear error', msg);
  try { w.createBody({ shape: 'box', collider: 'bouncy' }); } catch (e) { msg = e.message; }
  ok(/unknown collider 'bouncy'/.test(msg), 'an unknown collider throws a clear error', msg);
  w.dispose();
}

console.log(`\n${pass} passed, ${fail} failed  (fixed step ${(FIXED_DT * 1000).toFixed(2)} ms)`);
process.exit(fail ? 1 : 0);
