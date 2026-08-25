// moshion-checks-parity.mjs — parity checks against REAL p5play v3 semantics.
//
// moshion-checks.mjs proves the engine runs; this file proves it matches the
// library it claims to clone. Every check here was written against real
// p5play source (a verified local copy of p5play v3, p5play.js/.d.ts) — not
// memory of how p5play behaves. Where I could not pin down real p5play's
// behaviour from source, I skipped the check rather than encode a guess (see
// the critic report for the one case this happened).
//
// Same contract as moshion-checks.mjs: `run()` returns `true` to pass, or a
// STRING with expected vs actual (real numbers) to fail.

const close = (a, b, tol) => Math.abs(a - b) <= tol;

export const PARITY_CHECKS = [
  // ---- collision ----------------------------------------------------------
  {
    name: 'group.overlaps(sprite, cb) invokes the callback per overlapping member',
    area: 'collision',
    run({ runSketch }) {
      // Group.overlaps(other, cb) = this.some(s => s.overlaps(other, cb)).
      // Each member's overlaps() only wires cb when `other instanceof Group`
      // (moshion.js ~302-315) — here `other` is a lone Sprite, so cb is never
      // reached no matter how many group members overlap it.
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          coins = new Group();
          one = new coins.Sprite(105,100,20); one.collider = 'none';
          two = new coins.Sprite(110,100,20); two.collider = 'none';
          three = new coins.Sprite(300,300,20); three.collider = 'none';
          player = new Sprite(100,100,40,40); player.collider = 'none';
          hitCount = 0; }
        function draw(){ coins.overlaps(player, function(c, p){ hitCount++; }); }
      `, { frames: 1 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const n = r.box.sandbox.hitCount;
      // two of three coins overlap the player -> cb should fire twice per call.
      return n === 2 ? true : `group.overlaps(sprite, cb) fired the callback ${n} times for 2 overlapping members, expected 2`;
    },
  },
  {
    name: 'sprite.overlaps(otherSprite, cb) invokes the callback when they overlap',
    area: 'collision',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a = new Sprite(100,100,40,40); a.collider = 'none';
          b = new Sprite(110,100,40,40); b.collider = 'none';
          calls = 0; }
        function draw(){ a.overlaps(b, function(x, y){ calls++; }); }
      `, { frames: 1 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const n = r.box.sandbox.calls;
      return n === 1 ? true : `sprite.overlaps(sprite, cb) fired the callback ${n} times for one overlapping pair, expected 1 (cb is only wired for the Group branch in _overlapsOne's caller)`;
    },
  },
  {
    name: 'group.overlaps(group, cb) checks every member pair, not just the first hit',
    area: 'collision',
    run({ runSketch }) {
      // Group.overlaps = this.some(s => s.overlaps(other, cb)). Array.some
      // short-circuits the OUTER loop the instant one member returns true,
      // so only the first sprite of groupA ever gets to fire cb against
      // groupB — the other two groupA members are never even visited.
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a1 = new Sprite(100,100,40,40); a1.collider = 'none';
          a2 = new Sprite(105,105,40,40); a2.collider = 'none';
          a3 = new Sprite(102,102,40,40); a3.collider = 'none';
          groupA = new Group(); groupA.push(a1,a2,a3);
          b1 = new Sprite(101,101,40,40); b1.collider = 'none';
          b2 = new Sprite(103,103,40,40); b2.collider = 'none';
          b3 = new Sprite(104,104,40,40); b3.collider = 'none';
          groupB = new Group(); groupB.push(b1,b2,b3);
          hits = 0;
          groupA.overlaps(groupB, function(a,b){ hits++; }); }
        function draw(){}
      `, { frames: 1 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const n = r.box.sandbox.hits;
      // 3 sprites all mutually overlapping 3 sprites -> 9 pairs total.
      return n === 9 ? true : `3-member group overlapping a 3-member group fired the callback ${n} times, expected 9 (got exactly 3 — Array.prototype.some stopped after the first groupA member)`;
    },
  },
  {
    name: 'sprite exposes all six p5play collision verbs (collides/colliding/collided, overlaps/overlapping/overlapped)',
    area: 'collision',
    run({ runSketch }) {
      // Real p5play Sprite (p5play.js ~4221-4368) defines all six as
      // functions with distinct edge-triggered semantics: collides/overlaps
      // = true on first contact frame, colliding/overlapping = frame count
      // while touching, collided/overlapped = true on first separation frame.
      const r = runSketch(`
        function setup(){ new Canvas(200,200); s = new Sprite(50,50,20);
          types = {
            collides: typeof s.collides, colliding: typeof s.colliding, collided: typeof s.collided,
            overlaps: typeof s.overlaps, overlapping: typeof s.overlapping, overlapped: typeof s.overlapped,
          }; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const t = r.box.sandbox.types;
      const missing = Object.entries(t).filter(([, v]) => v !== 'function').map(([k, v]) => `${k}=${v}`);
      return missing.length === 0 ? true : `missing/wrong-type collision verbs: ${missing.join(', ')} (all six should be 'function')`;
    },
  },
  {
    name: "overlaps() and world.getSpriteAt() disagree on circle geometry — overlaps() treats circles as axis-aligned boxes",
    area: 'collision',
    run({ runSketch }) {
      // Sprite._bounds() (moshion.js ~292-296) always returns a plain AABB,
      // even for circle sprites — _overlapsOne() then does rectangle math on
      // that AABB. world.getSpriteAt() (moshion.js ~472-485) does true
      // circle math (dx*dx+dy*dy <= r*r) for circle-shaped sprites. Two
      // circles of diameter 40 centered 49.5px apart (radius sum 40) do NOT
      // actually touch, but their AABBs' corners overlap.
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a = new Sprite(100,100,40); a.collider = 'none';
          b = new Sprite(135,135,40); b.collider = 'none';
          hit = a.overlaps(b);
          atPoint = world.getSpriteAt(119,119); }
        function draw(){}
      `, { frames: 1 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { hit, atPoint } = r.box.sandbox;
      // center distance = sqrt(35^2+35^2) ≈ 49.5px > 40px (radius sum) -> circles don't touch.
      if (hit !== false) return `two circles 49.5px apart (radius sum 40px, so not actually touching) reported overlaps() = ${hit}, expected false — overlaps() is doing AABB math instead of circle math`;
      // (atPoint is expected undefined here too — getSpriteAt correctly excludes both circles at
      // this corner point, which is exactly the geometry overlaps() gets wrong. Documented, not asserted,
      // since this check's job is to catch overlaps(), not to re-verify getSpriteAt.)
      return true;
    },
  },

  // ---- input ----------------------------------------------------------------
  {
    // CORRECTED framing: real p5play does NOT have seven distinct verbs.
    // `pressed(inp)` is a literal alias of `released(inp)` — p5play's own
    // docstring says "Same as the released function, which is preferred"
    // (p5play.js ~9662-9669). The distinct set is six: presses/pressing/
    // holds/holding/held/released. moSHion's own `pressed`/`released` are
    // ALREADY correctly aliased (both `(k) => !!KEYS_RELEASED[k]`) — that
    // part of the engine is right; holds/holding/held are still missing.
    name: 'kb exposes the six distinct p5play keyboard verbs, with pressed as a true alias of released',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(100,100); }
        function draw(){}
      `);
      box.pump(1);
      const kb = box.sandbox.kb;
      const distinct = ['presses', 'pressing', 'holds', 'holding', 'held', 'released'];
      const missing = distinct.filter((k) => typeof kb[k] !== 'function');
      if (missing.length) return `kb is missing verbs: ${missing.join(', ')} (typeof each is not 'function')`;
      if (typeof kb.pressed !== 'function') return `kb.pressed is ${typeof kb.pressed}, expected a function (alias of released)`;
      // alias check: press then release 'a', pressed() and released() must
      // agree on every frame around the release edge, not just both exist.
      const box2 = createSandbox();
      box2.run(`
        agree = true;
        function setup(){ new Canvas(100,100); }
        function draw(){ if (kb.pressed('a') !== kb.released('a')) agree = false; }
      `);
      box2.pump(2);
      box2.input.keyDown('a');
      box2.pump(3);
      box2.input.keyUp('a');
      box2.pump(3);
      if (box2.errors.length) return `sketch threw: ${box2.errors[0].message}`;
      return box2.sandbox.agree ? true : `kb.pressed('a') and kb.released('a') disagreed on at least one frame — pressed() is documented as a literal alias of released()`;
    },
  },
  {
    name: 'kb.pressing() returns the exact rising frame-count p5play uses, not a boolean',
    area: 'input',
    run({ createSandbox }) {
      // Real p5play InputDevice.pressing(inp) (p5play.js ~9655-9660) reads a
      // single signed counter that resets to 1 on the first down frame and
      // increments every frame after: pressing() returns that counter
      // (0 while idle). One frame idle, then a 4-frame hold -> [0,1,2,3,4].
      const box = createSandbox();
      box.run(`
        seq = [];
        function setup(){ new Canvas(100,100); }
        function draw(){ seq.push(kb.pressing('a')); }
      `);
      box.pump(1);
      box.input.keyDown('a');
      box.pump(4);
      const seq = box.sandbox.seq;
      const want = [0, 1, 2, 3, 4];
      const match = JSON.stringify(seq) === JSON.stringify(want);
      return match ? true : `kb.pressing('a') returned ${JSON.stringify(seq)} across 1 idle frame + a 4-frame hold, expected ${JSON.stringify(want)} (p5play's counter: 1 on first down frame, then ++ each frame held)`;
    },
  },
  {
    name: 'kb.holdThreshold defaults to 12, matching p5play',
    area: 'input',
    run({ createSandbox }) {
      // p5play.js ~9628: "The amount of frames an input must be pressed to
      // be considered held. @default 12".
      const box = createSandbox();
      box.run(`function setup(){ new Canvas(100,100); } function draw(){}`);
      box.pump(1);
      const v = box.sandbox.kb.holdThreshold;
      return v === 12 ? true : `kb.holdThreshold is ${v} (typeof ${typeof v}), expected 12`;
    },
  },
  {
    name: "kb.holds()/kb.held() fire exactly once each, at the 12-frame threshold and at release, matching p5play's counter state machine",
    area: 'input',
    run({ createSandbox }) {
      // p5play.js: holds(inp) fires when counter == holdThreshold (~9678,
      // fires exactly once as the counter climbs past it); held(inp) fires
      // when the counter is set to -2 on release after crossing the
      // threshold (~9698, also exactly once). Hold well past 12 frames,
      // then release, and count how many draw() frames each verb is true.
      const box = createSandbox();
      box.run(`
        holdsCount = 0; heldCount = 0;
        function setup(){ new Canvas(100,100); }
        function draw(){ if (kb.holds('a')) holdsCount++; if (kb.held('a')) heldCount++; }
      `);
      box.pump(2);
      box.input.keyDown('a');
      box.pump(20); // well past holdThreshold=12
      box.input.keyUp('a');
      box.pump(3);
      if (box.errors.length) return `sketch threw: ${box.errors[0].message}`;
      const { holdsCount, heldCount } = box.sandbox;
      if (holdsCount !== 1) return `kb.holds('a') was true on ${holdsCount} frames across a 20-frame hold past the 12-frame threshold, expected exactly 1`;
      if (heldCount !== 1) return `kb.held('a') was true on ${heldCount} frames after releasing a held key, expected exactly 1`;
      return true;
    },
  },

  // ---- joints ---------------------------------------------------------------
  {
    name: 'HingeJoint({anchor:{x:0,y:0}}) honors an explicit zero anchor instead of discarding it',
    area: 'joints',
    run({ runSketch }) {
      // moshion.js _anchor(): `(opt.anchor && opt.anchor.x) || a.x` — `||`
      // treats a legitimate 0 as absent and falls back to sprite a's position.
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a = new Sprite(200,200,20,20,'static');
          b = new Sprite(220,200,20,20);
          j = new HingeJoint(a, b, { anchor: { x: 0, y: 0 } });
          ax = j._joint.getAnchorA().x * 30; ay = j._joint.getAnchorA().y * 30; }
        function draw(){}
      `, { frames: 1 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { ax, ay } = r.box.sandbox;
      if (!close(ax, 0, 1) || !close(ay, 0, 1)) return `HingeJoint anchor {x:0,y:0} produced anchor (${ax.toFixed(1)}, ${ay.toFixed(1)}), expected (0, 0) — the 0s were treated as falsy and sprite a's own position (200,200) was used instead`;
      return true;
    },
  },
  {
    name: 'DistanceJoint({length:0}) honors an explicit zero length instead of computing separation',
    area: 'joints',
    run({ runSketch }) {
      // moshion.js DistanceJoint: `(opt.length) ? opt.length/PXM : sep` — a
      // ternary on a falsy 0 also falls through to the computed separation.
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a = new Sprite(200,200,20,20,'static');
          b = new Sprite(260,200,20,20);
          j = new DistanceJoint(a, b, { length: 0 });
          len = j.length; }
        function draw(){}
      `, { frames: 1 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const len = r.box.sandbox.len;
      return close(len, 0, 1) ? true : `DistanceJoint length:0 produced joint.length = ${len.toFixed(1)}, expected 0 — fell back to the 60px sprite separation instead`;
    },
  },
  {
    name: 'GrabberJoint({maxForce:0}) honors an explicit zero maxForce instead of defaulting to 100',
    area: 'joints',
    run({ runSketch }) {
      // moshion.js GrabberJoint: `(opt.maxForce) || 100` — same falsy-0 bug.
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a = new Sprite(200,200,20,20,'static');
          b = new Sprite(220,200,20,20);
          j = new GrabberJoint(a, b, { maxForce: 0 });
          mf = j._joint.getMaxForce(); }
        function draw(){}
      `, { frames: 1 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const mf = r.box.sandbox.mf;
      return mf === 0 ? true : `GrabberJoint maxForce:0 produced getMaxForce() = ${mf}, expected 0 — defaulted to 100 instead`;
    },
  },

  // ---- sprite-props -----------------------------------------------------
  {
    name: 'a new sprite defaults density to 5, matching p5play',
    // DECISION D1: moSHion keeps its own defaults on purpose — adopting
    // p5play's would change the behaviour of all 271 working sketches.
    // Reported as a delta, never gates.
    informational: true,
    area: 'sprite-props',
    run({ runSketch }) {
      // p5play.js ~963: `props.density ??= this.density || 5;`
      const r = runSketch(`
        function setup(){ new Canvas(100,100); s = new Sprite(50,50,20);
          densT = typeof s.density; densV = s.density; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { densT, densV } = r.box.sandbox;
      if (densT !== 'number') return `s.density is ${densT} (${densV}), expected the number 5 — moSHion has no density property at all`;
      return densV === 5 ? true : `s.density is ${densV}, expected 5`;
    },
  },
  {
    name: 'a new sprite defaults friction to 0.5, matching p5play',
    // DECISION D1: moSHion keeps its own defaults on purpose — adopting
    // p5play's would change the behaviour of all 271 working sketches.
    // Reported as a delta, never gates.
    informational: true,
    area: 'sprite-props',
    run({ runSketch }) {
      // p5play.js ~964: `props.friction ??= this.friction || 0.5;`
      const r = runSketch(`
        function setup(){ new Canvas(100,100); s = new Sprite(50,50,20); f = s.friction; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const f = r.box.sandbox.f;
      return close(f, 0.5, 0.001) ? true : `s.friction is ${f}, expected 0.5`;
    },
  },
  {
    name: 'a new sprite defaults bounciness to 0.2, matching p5play',
    // DECISION D1: moSHion keeps its own defaults on purpose — adopting
    // p5play's would change the behaviour of all 271 working sketches.
    // Reported as a delta, never gates.
    informational: true,
    area: 'sprite-props',
    run({ runSketch }) {
      // p5play.js ~965: `props.restitution ??= this.bounciness || 0.2;`
      const r = runSketch(`
        function setup(){ new Canvas(100,100); s = new Sprite(50,50,20); b = s.bounciness; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const b = r.box.sandbox.b;
      return close(b, 0.2, 0.001) ? true : `s.bounciness is ${b}, expected 0.2`;
    },
  },
  {
    name: 'sprite exposes mass, speed, direction, text, opacity, moveTowards, rotateTo, debug (real p5play Sprite surface)',
    area: 'sprite-props',
    run({ runSketch }) {
      // Confirmed present in real p5play.js: mass (~2102), speed (~2401),
      // direction (~1848), text/textFill (~1668), opacity (~2208),
      // moveTowards (~3439), rotateTo (~3778), debug (~1795).
      const r = runSketch(`
        function setup(){ new Canvas(100,100); s = new Sprite(50,50,20);
          types = {
            mass: typeof s.mass, speed: typeof s.speed, direction: typeof s.direction,
            text: typeof s.text, opacity: typeof s.opacity,
            moveTowards: typeof s.moveTowards, rotateTo: typeof s.rotateTo, debug: typeof s.debug,
          }; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const t = r.box.sandbox.types;
      const missing = Object.entries(t).filter(([, v]) => v === 'undefined').map(([k]) => k);
      return missing.length === 0 ? true : `sprite is missing: ${missing.join(', ')} (all 'undefined'; real p5play defines every one of these on Sprite)`;
    },
  },
  {
    name: 'group.push() rejects duplicate membership (a sprite popped and re-pushed twice does not double-count)',
    area: 'sprite-props',
    run({ runSketch }) {
      // Group.push() only guards its own _groups[] bookkeeping against
      // duplicates (`!s._groups.includes(this)`) — it never checks whether
      // the sprite is already IN THE ARRAY before calling super.push(). A
      // sprite popped out (which leaves its stale _groups entry behind,
      // since pop()/splice() bypass the push()/remove() bookkeeping) and
      // then pushed back twice ends up counted twice, and delete() only
      // ever removes ONE of the duplicate array slots (indexOf finds the
      // first), leaving a dead ghost entry inflating group.length forever.
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          coins = new Group();
          a = new coins.Sprite(10,10,8);
          coins.pop();
          coins.push(a);
          coins.push(a);
          afterPushes = coins.length;
          a.delete();
          afterDelete = coins.length; }
        function draw(){}
      `, { frames: 3 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { afterPushes, afterDelete } = r.box.sandbox;
      if (afterPushes !== 1) return `after popping sprite 'a' then pushing it twice, coins.length is ${afterPushes}, expected 1 — the group now holds a duplicate reference to the same sprite`;
      if (afterDelete !== 0) return `after a.delete(), coins.length is ${afterDelete}, expected 0 — a dead duplicate entry is still sitting in the group array`;
      return true;
    },
  },

  // ---- physics --------------------------------------------------------------
  {
    // Team-lead verified against real p5play source: world.gravity defaults
    // to {x:0, y:0} (no gravity until a sketch sets it). moSHion's `_world()`
    // hardcodes `pl.World({ gravity: pl.Vec2(0, 9.8) })` — gravity is ON by
    // default. This is a DEFAULTS DELTA, not necessarily a bug to blindly fix
    // (see report) — 270 working lessons may depend on moSHion's default.
    name: 'world.gravity defaults to (0, 0), matching p5play (no gravity until a sketch sets it)',
    // DECISION D1: moSHion turns gravity ON by default so a student's first
    // sprite falls without ceremony. p5play's 0 would break every
    // falling-object lesson at once. Reported, never gated.
    informational: true,
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(100,100); gx = world.gravity.x; gy = world.gravity.y; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { gx, gy } = r.box.sandbox;
      return (gx === 0 && gy === 0) ? true : `world.gravity defaults to (${gx}, ${gy}), expected (0, 0)`;
    },
  },

  // ---- documented divergence ----------------------------------------------
  {
    name: 'overlaps() is edge-triggered like the reference API (fires only on the first frame)',
    area: 'collision',
    // DECISION D11: moSHion's overlaps() is LEVEL-triggered on purpose. The
    // curriculum defines it that way in prose -- lessons/6-1-8-reading-collisions
    // says "it's `true` for the frames the bounding boxes intersect" -- and
    // 14 lessons rely on it, including `if (player.overlaps(goalZone))`, which
    // needs to stay true while the player is inside the zone.
    // Measured and reported so the divergence is visible, never gated.
    informational: true,
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(600,200); world.gravity.y = 0;
          p = new Sprite(100,100,40,40); p.collider = 'none';
          c = new Sprite(300,100,40,40); c.collider = 'none';
          p.vel.x = 8; hits = 0; }
        function draw(){ if (p.overlaps(c)) hits++; }
      `, { frames: 200 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const hits = r.box.sandbox.hits;
      if (hits === 1) return true;
      return `overlaps() reported true on ${hits} frames of one pass-through; the reference API fires once. moSHion is level-triggered by curriculum design (D11) -- collides()/overlapping()/overlapped() carry the the reference API-faithful edge and count semantics`;
    },
  },
];
