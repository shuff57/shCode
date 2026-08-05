'use strict';
/* Headless smoke tests for engine.js — plain Node, zero extra dependencies.
 *
 * engine.js is a browser-only, no-build-step script (loaded via <script> tags
 * in demo.html): `window` IS the global object there, and it's evaluated as a
 * classic (non-module) script. Each test gets its own isolated `vm` context
 * (its own fresh `window`/global object) — the same isolation a real browser
 * gives every page load — so engine.js's module-singleton state (ALL_, WORLD_,
 * FRAME_, the non-configurable `frameCount` getter) never leaks between tests.
 *
 * Run: node spikes/engine-spike/smoke-test.cjs
 */

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ENGINE_PATH = path.join(__dirname, 'engine.js');
const PLANCK_PATH = path.join(__dirname, 'vendor', 'planck.min.js');
const planckSrc = fs.readFileSync(PLANCK_PATH, 'utf8');
const engineSrc = fs.readFileSync(ENGINE_PATH, 'utf8');

// ---- sandbox factory: one fresh, isolated "browser page" per test ------

function createSandbox() {
  const sandbox = {};
  sandbox.window = sandbox;

  let lastCanvas = null;
  const ctxCalls = { count: 0 };
  function makeCtxStub() {
    // Any method call / property assignment on the 2D context is a no-op —
    // these tests check physics/logic, not pixels. `get` accesses are
    // counted so a test can assert "nothing tried to draw this frame"
    // (used by the sprite.visible gap test).
    return new Proxy({}, { get: () => { ctxCalls.count++; return () => {}; } });
  }
  function makeCanvasStub() {
    const listeners = {};
    return {
      width: 0, height: 0,
      getContext: () => makeCtxStub(),
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      _listeners: listeners,
    };
  }
  sandbox.document = {
    createElement: () => (lastCanvas = makeCanvasStub()),
    body: { appendChild() {} },
  };

  const windowListeners = {};
  sandbox.addEventListener = (type, fn) => { (windowListeners[type] ||= []).push(fn); };

  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 64; this.naturalHeight = 64; this.onload = null; }
    set src(v) { this._src = v; this.complete = true; if (this.onload) this.onload(); }
    get src() { return this._src; }
  }
  sandbox.Image = FakeImage;

  const store = new Map();
  sandbox.localStorage = {
    setItem: (k, v) => store.set(k, String(v)),
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    removeItem: (k) => store.delete(k),
  };

  let fakeNow = 0;
  sandbox.performance = { now: () => fakeNow };

  let rafCallback = null;
  sandbox.requestAnimationFrame = (cb) => { rafCallback = cb; return 1; };

  vm.createContext(sandbox);
  vm.runInContext(planckSrc, sandbox, { filename: PLANCK_PATH });
  vm.runInContext(engineSrc, sandbox, { filename: ENGINE_PATH });

  // Drives the engine's rAF loop deterministically — no real waiting, no flakiness.
  function tick(steps = 1, dtMs = 1000 / 60) {
    for (let i = 0; i < steps; i++) {
      fakeNow += dtMs;
      const cb = rafCallback;
      rafCallback = null;
      if (cb) cb(fakeNow);
    }
  }
  function fireWindow(type, evt) {
    for (const fn of windowListeners[type] || []) fn(evt);
  }
  function fireCanvas(type, evt) {
    for (const fn of (lastCanvas && lastCanvas._listeners[type]) || []) fn(evt);
  }

  return { sandbox, tick, fireWindow, fireCanvas, ctxCalls };
}

// ---- tiny test runner ---------------------------------------------------

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function run() {
  let pass = 0, fail = 0;
  for (const { name, fn } of tests) {
    try {
      fn(createSandbox());
      console.log(`ok   - ${name}`);
      pass++;
    } catch (err) {
      console.log(`FAIL - ${name}`);
      console.log('     ' + (err && err.stack ? err.stack.split('\n').join('\n     ') : err));
      fail++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
}

function finite2(s) { return Number.isFinite(s.x) && Number.isFinite(s.y); }

// =========================================================================
// pre-existing behavior (must keep passing — no regressions)
// =========================================================================

test('movement + overlap + edge-triggered jump (pre-existing)', ({ sandbox: s, tick, fireWindow }) => {
  let player, coins, collected = 0;
  const jumpsTriggered = [];
  s.setup = () => {
    new s.Canvas(400, 300);
    s.world.gravity.y = 0;
    player = new s.Sprite(50, 150, 30, 200);
    coins = new s.Group();
    coins.color = 'lime';
    coins.collider = 'none'; // sensor: pass through the player, overlaps() still detects them
    for (let i = 0; i < 3; i++) {
      new coins.Sprite(50 + i * 40, 150, 10, 10);
    }
  };
  s.update = () => {
    player.vel.x = s.kb.pressing('d') ? 5 : 0;
    if (s.kb.presses(' ')) jumpsTriggered.push(s.frameCount);
    for (let i = coins.length - 1; i >= 0; i--) {
      // apple.delete()-style cleanup (2.3.7) — group.remove() only unparents
      if (player.overlaps(coins[i])) { coins[i].delete(); collected++; }
    }
  };
  s.draw = () => {};
  s.start();

  fireWindow('keydown', { key: 'd', preventDefault() {} });
  tick(60); // up to 60 frames * 5px/frame = 300px of travel, sweeping past all 3 coins
  fireWindow('keyup', { key: 'd' });

  assert.ok(player.x > 150, `expected player to move right, got x=${player.x}`);
  assert.equal(collected, 3, `expected all 3 coins collected, got ${collected}`);
  assert.equal(coins.length, 0, 'expected coins group emptied by delete()');

  // Edge-triggered jump: a single keydown must register as exactly one
  // kb.presses() hit, on the very next frame — not zero (the reset-order
  // bug this ticket found and fixed) and not one per frame held down.
  fireWindow('keydown', { key: ' ', preventDefault() {} });
  tick(5); // key stays "down" (held) for all 5 frames, no repeat keydown fired
  fireWindow('keyup', { key: ' ' });
  tick(2);

  assert.equal(jumpsTriggered.length, 1, `expected exactly one edge-triggered jump, got ${jumpsTriggered.length}`);
});

test('gravity + bounce (pre-existing)', ({ sandbox: s, tick }) => {
  let ball;
  s.setup = () => {
    new s.Canvas(400, 300);
    s.world.gravity.y = 0.6;
    const ground = new s.Sprite(200, 280, 400, 20);
    ground.body = 'static';
    ball = new s.Sprite(200, 40, 24, 24);
    ball.shape = 'circle';
    ball.bounciness = 0.7;
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  const velY = [];
  for (let i = 0; i < 180; i++) { tick(); velY.push(ball.vel.y); }

  assert.ok(finite2(ball.pos), 'ball position went NaN/Infinite');
  assert.ok(ball.y > 100, `expected the ball to fall under gravity, stayed at y=${ball.y}`);
  assert.ok(ball.y < 300, `expected the ground to stop the ball, fell through to y=${ball.y}`);
  assert.ok(velY.some((v) => v < -0.1), 'expected an upward (bounce) velocity spike after hitting the ground');
});

function jointSmoke(name, build) {
  test(`joint: ${name} (pre-existing)`, ({ sandbox: s, tick }) => {
    let a, b;
    s.setup = () => {
      new s.Canvas(400, 400);
      s.world.gravity.y = 0.4;
      ({ a, b } = build(s));
    };
    s.update = () => {};
    s.draw = () => {};
    s.start();

    for (let i = 0; i < 120; i++) tick();

    assert.ok(finite2(a.pos) && finite2(b.pos), `${name}: joint produced NaN/Infinite position`);
    const sep = Math.hypot(b.x - a.x, b.y - a.y);
    assert.ok(sep < 600, `${name}: bodies drifted apart (sep=${sep}) — joint likely not constraining anything`);
  });
}

jointSmoke('HingeJoint', (s) => {
  const a = new s.Sprite(150, 60, 10, 10); a.body = 'static';
  const b = new s.Sprite(150, 160, 20, 20); b.shape = 'circle';
  new s.HingeJoint(a, b);
  return { a, b };
});

jointSmoke('DistanceJoint', (s) => {
  const a = new s.Sprite(150, 60, 10, 10); a.body = 'static';
  const b = new s.Sprite(150, 160, 20, 20); b.shape = 'circle';
  new s.DistanceJoint(a, b);
  return { a, b };
});

jointSmoke('SliderJoint', (s) => {
  // Horizontal slide axis, perpendicular to gravity: gravity should be
  // constrained (no vertical drift), and nothing drives horizontal motion,
  // so this checks the joint actually constrains rather than free-falling
  // along its own unconstrained axis (which a vertical axis would do here).
  const a = new s.Sprite(150, 60, 10, 10); a.body = 'static';
  const b = new s.Sprite(150, 60, 20, 20);
  new s.SliderJoint(a, b, { axis: { x: 1, y: 0 } });
  return { a, b };
});

jointSmoke('WheelJoint', (s) => {
  const a = new s.Sprite(150, 60, 10, 10); a.body = 'static';
  const b = new s.Sprite(150, 160, 20, 20); b.shape = 'circle';
  new s.WheelJoint(a, b, { axis: { x: 0, y: 1 } });
  return { a, b };
});

jointSmoke('GrabberJoint', (s) => {
  const a = new s.Sprite(150, 60, 10, 10); a.body = 'static';
  const b = new s.Sprite(150, 160, 20, 20);
  new s.GrabberJoint(a, b);
  return { a, b };
});

// =========================================================================
// gap 1 — Ani/Anis/addAni/changeAni (2.4.x)
// =========================================================================

test('gap: addAni auto-activates, changeAni swaps (2.4.3a-b)', ({ sandbox: s }) => {
  let ghost;
  s.setup = () => {
    new s.Canvas(300, 200);
    ghost = new s.Sprite(150, 100, 40, 40);
    ghost.addAni('idle', '/assets/ghost_idle.avif', 4); // first addAni -> auto-active
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(ghost.ani.name, 'idle', 'first addAni should auto-activate');
  assert.equal(ghost.ani.frameCount, 4);
  assert.equal(ghost.ani.frameDelay, 4, 'default frameDelay should be 4');

  ghost.addAni('fly', '/assets/ghost_fly.avif', 2);
  assert.equal(ghost.ani.name, 'idle', 'registering a 2nd ani must not steal activation from the 1st');

  ghost.changeAni('teleport'); // unregistered name
  assert.equal(ghost.ani.name, 'idle', 'changeAni to an unregistered name must be a silent no-op');

  ghost.changeAni('fly');
  assert.equal(ghost.ani.name, 'fly', 'changeAni should swap to a registered animation');
});

test('gap: addAni frameDelay actually paces the frame advance (2.4.3c)', ({ sandbox: s, tick }) => {
  let ghost;
  s.setup = () => {
    new s.Canvas(300, 200);
    ghost = new s.Sprite(150, 100, 40, 40);
    ghost.addAni('fly', '/assets/ghost_fly.avif', 2);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  for (let i = 0; i < 4; i++) tick(); // frameDelay=4 -> exactly one advance
  assert.equal(ghost.ani.frame, 1, `expected frame to advance once after 4 ticks at frameDelay=4, got ${ghost.ani.frame}`);

  ghost.ani.frameDelay = 1;
  tick();
  assert.equal(ghost.ani.frame, 0, `frameDelay=1 should advance (and wrap the 2-frame cycle) every tick, got ${ghost.ani.frame}`);
});

// =========================================================================
// gap 2 — GlueJoint
// =========================================================================

jointSmoke('GlueJoint', (s) => {
  const a = new s.Sprite(150, 100, 20, 20); a.body = 'static';
  const b = new s.Sprite(150, 130, 20, 20);
  new s.GlueJoint(a, b);
  return { a, b };
});

test('gap: GlueJoint holds relative pose fixed under an applied force', ({ sandbox: s, tick }) => {
  let a, b;
  s.setup = () => {
    new s.Canvas(400, 400);
    s.world.gravity.y = 0;
    a = new s.Sprite(150, 100, 20, 20);
    b = new s.Sprite(150, 130, 20, 20); // 30px below a
    new s.GlueJoint(a, b);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  const before = Math.hypot(b.x - a.x, b.y - a.y);
  for (let i = 0; i < 60; i++) { a.applyForce(2, 0); tick(); }
  const after = Math.hypot(b.x - a.x, b.y - a.y);

  assert.ok(finite2(a.pos) && finite2(b.pos), 'GlueJoint produced NaN/Infinite position');
  assert.ok(a.x > 160, `expected the applied force to move the glued pair, a.x=${a.x}`);
  assert.ok(Math.abs(after - before) < before * 0.25, `glued sprites should keep ~constant separation, was ${before} now ${after}`);
});

// =========================================================================
// gap 3 — Group-scoped `new groupName.Sprite(...)` factory
// =========================================================================

test('gap: new groupName.Sprite(...) inherits group defaults (2.3.3)', ({ sandbox: s }) => {
  let apples, a;
  s.setup = () => {
    new s.Canvas(400, 400);
    apples = new s.Group();
    apples.color = 'red';
    a = new apples.Sprite(100, -20); // real usage: 2-arg call, no w/h (2-3-7)
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(a.color, 'red', 'factory-spawned sprite should inherit the group default color');
  assert.equal(a.w, 50, 'omitted size should fall back to the q5play default (50)');
  assert.equal(a.h, 50);
  assert.ok(apples.includes(a), 'factory-spawned sprite should join the group');

  const bare = new s.Sprite(10, 10, 5, 5);
  assert.equal(bare.color, 'deeppink', 'bare `new Sprite()` must NOT pick up group defaults');

  apples.color = 'white';
  const b = new apples.Sprite(200, -20);
  assert.equal(a.color, 'red', 'changing the group default later must not retroactively repaint existing members');
  assert.equal(b.color, 'white', 'new spawns should read the default fresh at spawn time');
});

// =========================================================================
// gap 4 — world.getSpriteAt(x, y)
// =========================================================================

test('gap: world.getSpriteAt hit-tests the top-most sprite (2.7.6)', ({ sandbox: s }) => {
  let box;
  s.setup = () => {
    new s.Canvas(400, 300);
    box = new s.Sprite(200, 150, 80, 80);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(s.world.getSpriteAt(200, 150), box, 'expected the hit-test to find the sprite under the point');
  assert.equal(s.world.getSpriteAt(390, 290), undefined, 'expected undefined where nothing is present');

  const topper = new s.Sprite(200, 150, 80, 80);
  topper.layer = 1;
  assert.equal(s.world.getSpriteAt(200, 150), topper, 'expected the higher-layer sprite to win the hit-test');
});

// =========================================================================
// gap 5 — mouse.presses()
// =========================================================================

test('gap: mouse.presses() exists, is edge-triggered, matches kb.presses() shape', ({ sandbox: s, tick, fireCanvas }) => {
  const presses = [];
  s.setup = () => { new s.Canvas(200, 200); };
  s.update = () => { if (s.mouse.presses()) presses.push(s.frameCount); };
  s.draw = () => {};
  s.start();

  assert.equal(typeof s.mouse.presses, 'function', 'mouse.presses must exist (renamed from pressed())');
  assert.equal(s.mouse.pressed, undefined, 'the old pressed() name should be gone, not left as a second alias');

  fireCanvas('mousedown', {});
  tick(5); // held down for 5 frames, single click — expect exactly one edge

  assert.equal(presses.length, 1, `expected exactly one edge-triggered press, got ${presses.length}`);
});

// =========================================================================
// gap 6 — Sprite.image loading (2.4.3d)
// =========================================================================

test('gap: sprite.image = url loads and is mutually exclusive with ani (2.4.3d)', ({ sandbox: s, tick }) => {
  let star;
  s.setup = () => {
    new s.Canvas(400, 200);
    star = new s.Sprite(200, 100, 80, 80);
    star.image = '/assets/star.webp';
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();
  tick(5); // render() runs each frame; must not throw with an image assigned

  assert.equal(star.image.src, '/assets/star.webp');
  assert.equal(star.image.complete, true, 'expected the fake Image to report load completion');

  star.addAni('idle', '/assets/idle.png', 2);
  assert.equal(star.image, null, 'activating an ani should clear the still image (mutually exclusive)');

  star.image = '/assets/star2.webp';
  assert.equal(star.ani, null, 'assigning .image should clear any active ani (mutually exclusive)');
});

// =========================================================================
// ticket 02 — exhaustive audit gaps (found beyond ticket 01's 6 head-start
// items; see engine.js header + execution notes for the full evidence trail)
// =========================================================================

test('gap: sprite.overlaps(group) boolean + overlaps(group, callback) (2.3.7/2.3.8) — was a hard crash before this ticket', ({ sandbox: s }) => {
  let basket, apples;
  s.setup = () => {
    new s.Canvas(300, 300);
    basket = new s.Sprite(100, 100, 40, 40);
    apples = new s.Group();
    apples.collider = 'none';
    new apples.Sprite(100, 100, 20, 20); // fully overlapping basket
    new apples.Sprite(250, 250, 20, 20); // far away, not overlapping
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(basket.overlaps(apples), true, 'boolean form should detect any overlapping group member (previously threw: other._bounds is not a function)');

  const hits = [];
  basket.overlaps(apples, (self, other) => { assert.equal(self, basket); hits.push(other); });
  assert.equal(hits.length, 1, 'callback form should fire once per overlapping pair');
  assert.equal(hits[0], apples[0]);
});

test('gap: collider="none" (sensor) is invisible to colliding() but visible to overlaps() (2.3.17)', ({ sandbox: s, tick }) => {
  let a, b;
  s.setup = () => {
    new s.Canvas(200, 200);
    s.world.gravity.y = 0;
    a = new s.Sprite(100, 100, 40, 40); a.body = 'static';
    b = new s.Sprite(100, 100, 40, 40); b.collider = 'none';
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();
  tick(5);

  assert.equal(b.collider, 'none');
  assert.ok(a.overlaps(b), 'overlaps() (bounding-box) should see the fully-overlapping sensor');
  assert.equal(a.colliding(b), 0, 'colliding() (real physics contact) should never register a sensor pair');
  assert.equal(b.x, 100, 'a sensor sprite should not be pushed apart by collision response');
});

test('gap: sprite.colliding() reads real physics contact and accepts a Group, incl. allSprites (2.3.17/2.4.10)', ({ sandbox: s, tick }) => {
  let player, ground;
  s.setup = () => {
    new s.Canvas(300, 300);
    s.world.gravity.y = 20;
    ground = new s.Sprite(150, 280, 300, 20, 'static');
    player = new s.Sprite(150, 100, 20, 20);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(player.colliding(ground), 0, 'not touching yet, mid-air');
  for (let i = 0; i < 120; i++) tick();
  assert.ok(player.colliding(ground) > 0, `expected a truthy frame count once resting on the ground, got ${player.colliding(ground)}`);
  assert.ok(player.colliding(s.allSprites) > 0, 'colliding(allSprites) should find the same contact (2.4.10 platformer idiom)');
});

test('gap: sprite.delete() destroys the body and unparents from every group, incl. implicit allSprites (2.3.3/2.3.7)', ({ sandbox: s }) => {
  let group, a;
  s.setup = () => {
    new s.Canvas(200, 200);
    group = new s.Group();
    a = new group.Sprite(50, 50);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.ok(group.includes(a));
  assert.ok(s.allSprites.includes(a), 'every sprite should auto-join the implicit allSprites group');

  a.delete();
  assert.ok(!group.includes(a), 'delete() should unparent from every group it belongs to');
  assert.ok(!s.allSprites.includes(a), 'delete() should also unparent from allSprites');
});

test('gap: group.remove(sprite) only unparents — sprite.delete() is required to destroy (2.3.3/2.3.7)', ({ sandbox: s }) => {
  let group, a;
  s.setup = () => {
    new s.Canvas(200, 200);
    group = new s.Group();
    a = new group.Sprite(50, 50);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  group.remove(a);
  assert.ok(!group.includes(a), 'group.remove should unparent from that group');
  assert.ok(s.allSprites.includes(a), 'group.remove must NOT destroy the sprite — it should still be alive in allSprites');
  assert.equal(a._dead, undefined, 'an unparented-only sprite must not be marked dead');
});

test('gap: sprite.diameter / group.diameter shorthand size setter', ({ sandbox: s }) => {
  let wheel, rocks, r;
  s.setup = () => {
    new s.Canvas(200, 200);
    wheel = new s.Sprite(50, 50, 10, 10);
    wheel.diameter = 20;
    rocks = new s.Group();
    rocks.diameter = 22;
    r = new rocks.Sprite(80, 80);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(wheel.w, 20); assert.equal(wheel.h, 20); assert.equal(wheel.shape, 'circle');
  assert.equal(r.w, 22); assert.equal(r.h, 22); assert.equal(r.shape, 'circle');
});

test('gap: Sprite constructor argument dispatch — 2/3/4/5-arg forms (2.2.6/2.3.8/2.3.14/2.3.19)', ({ sandbox: s }) => {
  let a, b, c, d;
  s.setup = () => {
    new s.Canvas(200, 200);
    a = new s.Sprite(10, 10);              // 2-arg: group-factory shorthand, 50x50 square
    b = new s.Sprite(20, 20, 30);          // 3-arg: circle, diameter 30
    c = new s.Sprite(30, 30, 10, 20);      // 4-arg: rect
    d = new s.Sprite(40, 40, 10, 10, 'static'); // 5-arg: rect + bodyType
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(a.w, 50); assert.equal(a.h, 50); assert.equal(a.shape, 'rect');
  assert.equal(b.w, 30); assert.equal(b.h, 30); assert.equal(b.shape, 'circle', '3-arg Sprite(x,y,d) should build a circle');
  assert.equal(c.w, 10); assert.equal(c.h, 20); assert.equal(c.shape, 'rect');
  assert.equal(d.body, 'static', '5-arg Sprite(x,y,w,h,bodyType) should apply the bodyType');
});

test('gap: joint.delete() releases a joint; DistanceJoint.length is settable post-construction (2.7.12/2.7.16/2.7.26)', ({ sandbox: s, tick }) => {
  let a, b, j;
  s.setup = () => {
    new s.Canvas(400, 400);
    s.world.gravity.y = 0;
    a = new s.Sprite(150, 100, 20, 20); a.body = 'static';
    b = new s.Sprite(150, 100, 20, 20);
    j = new s.DistanceJoint(a, b);
    j.length = 80; // set after construction — the real idiom (can't pass length as a 3rd ctor arg)
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  for (let i = 0; i < 30; i++) tick();
  const held = Math.hypot(b.x - a.x, b.y - a.y);
  assert.ok(Math.abs(held - 80) < 15, `expected the joint to hold ~80px separation after setting .length, got ${held}`);

  j.delete();
  for (let i = 0; i < 30; i++) { b.applyForce(5, 0); tick(); }
  const after = Math.hypot(b.x - a.x, b.y - a.y);
  assert.ok(after > held + 20, `expected b to drift free after joint.delete(), separation stayed at ${after}`);
});

test('gap: sprite.visible = false skips drawing but keeps physics running', ({ sandbox: s, tick, ctxCalls }) => {
  let sprite;
  s.setup = () => {
    new s.Canvas(200, 200);
    s.world.gravity.y = 0;
    sprite = new s.Sprite(100, 100, 20, 20);
    sprite.vel.x = 2;
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();
  tick(3);
  assert.ok(sprite.x > 100, 'physics should keep running regardless of visibility');

  let before = ctxCalls.count;
  tick();
  const visibleCallsPerFrame = ctxCalls.count - before;

  sprite.visible = false;
  before = ctxCalls.count;
  tick();
  const hiddenCallsPerFrame = ctxCalls.count - before;

  assert.ok(hiddenCallsPerFrame < visibleCallsPerFrame, `expected fewer canvas-context calls once invisible (visible=${visibleCallsPerFrame}, hidden=${hiddenCallsPerFrame})`);
});

test('gap: fill/textSize/textAlign globals + CENTER/LEFT/RIGHT constants (used before text() in 27 real files)', ({ sandbox: s, tick }) => {
  s.setup = () => { new s.Canvas(200, 200); };
  s.update = () => {};
  s.draw = () => {
    s.fill('white');
    s.fill(255);
    s.textSize(20);
    s.textAlign(s.CENTER);
    s.text('score', 10, 10); // must not throw with the new globals in play
  };
  s.start();
  assert.doesNotThrow(() => tick(3));
  assert.equal(typeof s.fill, 'function');
  assert.equal(typeof s.textSize, 'function');
  assert.equal(typeof s.textAlign, 'function');
  assert.equal(s.CENTER, 'center');
  assert.equal(s.LEFT, 'left');
  assert.equal(s.RIGHT, 'right');
});

test('gap: sprite.stroke / sprite.strokeWeight do not throw when drawing (2.2.6)', ({ sandbox: s, tick }) => {
  let rect, circ;
  s.setup = () => {
    new s.Canvas(400, 300);
    rect = new s.Sprite(120, 150, 80, 50);
    rect.stroke = 'white';
    rect.strokeWeight = 3;
    circ = new s.Sprite(280, 150, 60); // 3-arg circle form
    circ.stroke = 'black';
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();
  tick(3);
  assert.equal(rect.stroke, 'white');
  assert.equal(rect.strokeWeight, 3);
  assert.equal(circ.shape, 'circle');
});

test('gap: sprite.image = <emoji string> renders as a text placeholder, not a broken Image() load (2.4.5/2.4.10)', ({ sandbox: s, tick }) => {
  let player;
  s.setup = () => {
    new s.Canvas(300, 200);
    player = new s.Sprite(150, 100, 30, 30);
    player.image = '🧍'; // no '.' -> emoji placeholder, not a URL
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();
  tick(3); // render() must not try (and fail) to load '🧍' as an Image URL

  assert.equal(player.image, '🧍');

  player.image = '/assets/star.webp'; // '.' present -> real image load path
  assert.equal(player.image.src, '/assets/star.webp', 'a real path should still load via Image(), not be treated as emoji');
});

test('gap: sprite.scale.x flips the sprite horizontally (2.4.3b/2.4.11)', ({ sandbox: s }) => {
  let ghost;
  s.setup = () => {
    new s.Canvas(200, 200);
    ghost = new s.Sprite(100, 100, 20, 20);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(ghost.scale.x, 1);
  assert.equal(ghost.scale.y, 1);
  ghost.scale.x = -1;
  assert.equal(ghost.scale.x, -1, 'scale.x should be independently settable for left/right flip');
});

test('gap: sprite.angularVelocity — degrees-per-frame get/set on a dynamic body (2.3.19 pendulum kick, 2.3.21 car wheels)', ({ sandbox: s, tick }) => {
  let rod;
  s.setup = () => {
    new s.Canvas(400, 400);
    s.world.gravity.y = 0;
    rod = new s.Sprite(200, 140, 20, 120);
  };
  s.update = () => {};
  s.draw = () => {};
  s.start();

  assert.equal(rod.angularVelocity, 0, 'fresh body should have no angular velocity');
  rod.angularVelocity = 6; // the exact kick 2.3.19 applies on mouse.presses()
  assert.equal(rod.angularVelocity, 6, 'setter should round-trip in degrees per frame');

  tick(10);
  const angle = rod.rotation; // should have rotated ~60deg over 10 frames at 6 deg/frame (minus solver damping)
  assert.ok(angle > 0, `body should rotate under angular velocity (rotation after 10 frames: ${angle})`);
  assert.ok(angle < 180, `rotation should stay within plausible bounds (got ${angle})`);
});

run();
