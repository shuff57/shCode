// moshion-checks.mjs — named behaviour checks for the moSHion gate.
//
// Each check returns `true` to pass, or a STRING describing the observed
// wrongness to fail. Failure strings become the critic's evidence, so state
// the expected and actual value, never just "wrong".
//
// Every check is here because someone confirmed the engine can get it wrong.
// Adding one is how a critic's finding becomes permanent. Deleting one is a
// deliberate act, not a way to make a build green.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const close = (a, b, tol) => Math.abs(a - b) <= tol;

export const SEMANTIC_CHECKS = [
  // ---- physics ------------------------------------------------------------
  {
    name: 'gravity accelerates a dynamic sprite at the documented rate',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,600); world.gravity.y = 10;
          ball = new Sprite(200, 50, 20); }
        function draw(){ background('#000'); }
      `, { frames: 60 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const y = r.box.sandbox.ball.y;
      // s = 1/2 a t^2 -> 0.5 * 10 * 1^2 = 5m = 150px at 30px/m
      return close(y, 200, 4) ? true : `after 1s at gravity.y=10 expected y≈200, got ${y.toFixed(2)}`;
    },
  },
  {
    name: 'world.gravity.y = 0 actually sticks',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          ball = new Sprite(200, 200, 20); readback = world.gravity.y; }
        function draw(){}
      `, { frames: 30 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { ball, readback } = r.box.sandbox;
      if (readback !== 0) return `world.gravity.y read back as ${readback} after setting 0`;
      return close(ball.y, 200, 0.5) ? true : `zero-G sprite drifted to y=${ball.y.toFixed(2)}`;
    },
  },
  {
    name: 'static sprites ignore gravity',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 10;
          wall = new Sprite(200, 200, 100, 20, 'static'); }
        function draw(){}
      `, { frames: 60 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const y = r.box.sandbox.wall.y;
      return close(y, 200, 0.01) ? true : `static sprite fell to y=${y.toFixed(2)}`;
    },
  },
  {
    name: 'a dynamic sprite comes to rest on a static floor',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 10;
          box = new Sprite(200, 50, 40, 40);
          floor = new Sprite(200, 380, 400, 20, 'static'); }
        function draw(){}
      `, { frames: 300 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const y = r.box.sandbox.box.y;
      // floor top = 370, box half-height = 20 -> rest centre ≈ 350
      return close(y, 350, 3) ? true : `expected to rest at y≈350, got ${y.toFixed(2)} (fell through or bounced away)`;
    },
  },
  {
    name: 'bounciness = 0 does not bounce',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 10;
          ball = new Sprite(200, 50, 30); ball.bounciness = 0;
          floor = new Sprite(200, 380, 400, 20, 'static');
          peak = 999; }
        function draw(){ if (frameCount > 120) peak = Math.min(peak, ball.y); }
      `, { frames: 300 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { ball, peak } = r.box.sandbox;
      if (peak < ball.y - 12) return `bounciness=0 still rebounded ${(ball.y - peak).toFixed(1)}px`;
      return true;
    },
  },

  // ---- sprite construction ------------------------------------------------
  {
    name: 'new Sprite(x, y, d) is a circle of diameter d',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); s = new Sprite(100, 100, 44); }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const s = r.box.sandbox.s;
      if (s.shape !== 'circle') return `shape is '${s.shape}', expected 'circle'`;
      if (!close(s.diameter, 44, 0.01)) return `diameter is ${s.diameter}, expected 44`;
      return true;
    },
  },
  {
    name: 'new Sprite(x, y, w, h) is a rect of those dimensions',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); s = new Sprite(100, 100, 60, 25); }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const s = r.box.sandbox.s;
      if (s.shape !== 'rect') return `shape is '${s.shape}', expected 'rect'`;
      if (!close(s.w, 60, 0.01) || !close(s.h, 25, 0.01)) return `w,h = ${s.w},${s.h}, expected 60,25`;
      return true;
    },
  },
  {
    name: 'sprite.delete() removes it from allSprites',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); a = new Sprite(10,10); b = new Sprite(20,20);
          before = allSprites.length; a.delete(); }
        function draw(){ after = allSprites.length; }
      `, { frames: 5 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { before, after } = r.box.sandbox;
      if (before !== 2) return `expected 2 sprites before delete, got ${before}`;
      return after === 1 ? true : `expected 1 sprite after delete, got ${after}`;
    },
  },

  // ---- input --------------------------------------------------------------
  {
    name: 'kb.presses() is true for exactly one frame per keydown',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        counts = { presses: 0, pressing: 0 };
        function setup(){ new Canvas(200,200); }
        function draw(){ if (kb.presses('a')) counts.presses++; if (kb.pressing('a')) counts.pressing++; }
      `);
      if (box.errors.length) return `sketch threw: ${box.errors[0].message}`;
      box.pump(2);
      box.input.keyDown('a');
      box.pump(5);
      box.input.keyUp('a');
      box.pump(3);
      const c = box.sandbox.counts;
      if (c.presses !== 1) return `kb.presses('a') fired on ${c.presses} frames across one hold, expected exactly 1`;
      if (c.pressing < 4) return `kb.pressing('a') true on only ${c.pressing} frames of a 5-frame hold`;
      return true;
    },
  },
  {
    name: 'mouse.presses() is true for exactly one frame per click',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        counts = { presses: 0, released: 0 };
        function setup(){ new Canvas(200,200); }
        function draw(){ if (mouse.presses()) counts.presses++; if (mouse.released()) counts.released++; }
      `);
      if (box.errors.length) return `sketch threw: ${box.errors[0].message}`;
      box.pump(2);
      box.input.mouseDown();
      box.pump(4);
      box.input.mouseUp();
      box.pump(3);
      const c = box.sandbox.counts;
      if (c.presses !== 1) return `mouse.presses() fired on ${c.presses} frames, expected exactly 1`;
      if (c.released !== 1) return `mouse.released() fired on ${c.released} frames, expected exactly 1`;
      return true;
    },
  },
  {
    name: 'mouse.x / mouse.y track the pointer',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(300,300); }
        function draw(){ seen = { x: mouse.x, y: mouse.y }; }
      `);
      if (box.errors.length) return `sketch threw: ${box.errors[0].message}`;
      box.pump(1);
      box.input.mouseMove(120, 80);
      box.pump(1);
      const s = box.sandbox.seen;
      return (s.x === 120 && s.y === 80) ? true : `expected mouse at 120,80 got ${s.x},${s.y}`;
    },
  },

  // ---- group --------------------------------------------------------------
  {
    name: 'new group.Sprite(...) adds to both the group and allSprites',
    area: 'group',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400);
          coins = new Group();
          new coins.Sprite(50, 50, 10);
          new coins.Sprite(80, 50, 10);
          inGroup = coins.length; inAll = allSprites.length; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { inGroup, inAll } = r.box.sandbox;
      if (inGroup !== 2) return `group.length is ${inGroup}, expected 2`;
      if (inAll !== 2) return `allSprites.length is ${inAll}, expected 2`;
      return true;
    },
  },
  {
    name: 'group property defaults apply to sprites made after the default is set',
    area: 'group',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400);
          coins = new Group(); coins.color = 'gold';
          c = new coins.Sprite(50, 50, 10); }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const c = r.box.sandbox.c;
      return c.color === 'gold' ? true : `group default color 'gold' did not apply; sprite.color = '${c.color}'`;
    },
  },
  {
    name: 'deleting a sprite removes it from its group too',
    area: 'group',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400);
          coins = new Group(); a = new coins.Sprite(10,10,8); new coins.Sprite(30,10,8);
          a.delete(); }
        function draw(){ left = coins.length; }
      `, { frames: 5 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      return r.box.sandbox.left === 1 ? true : `group still holds ${r.box.sandbox.left} sprites after deleting one of two`;
    },
  },

  // ---- loop / globals -----------------------------------------------------
  {
    name: 'frameCount advances exactly once per frame',
    area: 'loop',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(200,200); }
        function draw(){ last = frameCount; }
      `);
      if (box.errors.length) return `sketch threw: ${box.errors[0].message}`;
      box.pump(10);
      return box.sandbox.last === 10 ? true : `after 10 frames frameCount is ${box.sandbox.last}`;
    },
  },
  {
    name: 'noLoop() stops the draw loop',
    area: 'loop',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        calls = 0;
        function setup(){ new Canvas(200,200); }
        function draw(){ calls++; if (calls === 3) noLoop(); }
      `);
      if (box.errors.length) return `sketch threw: ${box.errors[0].message}`;
      box.pump(20);
      return box.sandbox.calls === 3 ? true : `draw ran ${box.sandbox.calls} times after noLoop() at call 3`;
    },
  },
  {
    name: 'width / height report the canvas size',
    area: 'loop',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(640, 360); w = width; h = height; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { w, h } = r.box.sandbox;
      return (w === 640 && h === 360) ? true : `width,height = ${w},${h}, expected 640,360`;
    },
  },

  // ---- collision / overlap ------------------------------------------------
  {
    name: 'overlaps() is true for two intersecting sprites and false apart',
    area: 'collision',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a = new Sprite(100,100,40,40); a.collider = 'none';
          b = new Sprite(110,100,40,40); b.collider = 'none';
          c = new Sprite(300,300,40,40); c.collider = 'none'; }
        function draw(){ hit = a.overlaps(b); miss = a.overlaps(c); }
      `, { frames: 5 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { hit, miss } = r.box.sandbox;
      if (hit !== true) return `overlapping sprites reported overlaps() = ${hit}`;
      if (miss !== false) return `distant sprites reported overlaps() = ${miss}`;
      return true;
    },
  },
  {
    name: 'sprite.overlaps(group, cb) invokes the callback per overlapping member',
    area: 'collision',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          player = new Sprite(100,100,40,40); player.collider = 'none';
          coins = new Group();
          one = new coins.Sprite(105,100,20); one.collider = 'none';
          two = new coins.Sprite(300,300,20); two.collider = 'none';
          hits = []; }
        function draw(){ player.overlaps(coins, function(p, c){ hits.push(c); }); }
      `, { frames: 3 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const hits = r.box.sandbox.hits;
      if (!hits.length) return 'callback never fired for an overlapping group member';
      const distinct = new Set(hits).size;
      return distinct === 1 ? true : `callback fired for ${distinct} distinct sprites, expected only the overlapping one`;
    },
  },

  // ---- q5 global fidelity -------------------------------------------------
  // These exist because the corpus gate cannot see them: the sketch runs fine,
  // it just computes or draws the wrong thing. Each was measured wrong once.
  {
    name: 'dist() dispatches on arity like q5 — two points, four coords, six coords',
    area: 'q5-globals',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          four = dist(0,0,3,4);
          two  = dist({x:0,y:0},{x:3,y:4}); }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { four, two } = r.box.sandbox;
      if (four !== 5) return `dist(0,0,3,4) returned ${four}, expected 5`;
      if (two !== 5) return `dist({x:0,y:0},{x:3,y:4}) returned ${JSON.stringify(two)}, expected 5 — q5 dispatches on argument count and the 2-object form is missing`;
      return true;
    },
  },
  {
    name: 'rect() honours the 5th corner-radius argument',
    area: 'q5-globals',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200); }
        function draw(){ fill('white'); rect(10,10,80,40,8); }
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const ops = new Set(r.ops.map((o) => o.op));
      const rounded = ops.has('roundRect') || ops.has('arcTo') || ops.has('quadraticCurveTo');
      if (!rounded) {
        return `rect(10,10,80,40,8) drew [${[...ops].filter((o) => /rect|arc|curve|path/i.test(o)).join(', ')}] — a plain square-cornered rect; the radius argument was ignored. 6-5-21-example-confirm-overwrite draws rect(75,110,250,80,8)`;
      }
      return true;
    },
  },
  {
    name: 'int() exists and aliases floor (not trunc)',
    area: 'q5-globals',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          has = (typeof int !== 'undefined');
          v = has ? int(-2.5) : null; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const { has, v } = r.box.sandbox;
      if (!has) return 'int() is not defined; q5 defines it as a literal alias of floor';
      if (v !== -3) return `int(-2.5) returned ${v}, expected -3 — q5 aliases int to floor, not Math.trunc`;
      return true;
    },
  },
  {
    name: 'frameRate() exists',
    area: 'q5-globals',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200); t = typeof frameRate; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const t = r.box.sandbox.t;
      if (t !== 'function') return `frameRate is ${t}; a // STEP hint in 5-1-23-challenges tells students to display frameRate(), so following the instruction throws`;
      return true;
    },
  },
  {
    name: 'sprite.text renders on the canvas instead of being silently stored',
    area: 'sprite-props',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(300,200); world.gravity.y = 0;
          e = new Sprite(150,100,40,40); e.text = 'HP 3'; }
        function draw(){ background('#111'); }
      `, { frames: 3 });
      if (!r.ok) return `sketch threw: ${r.error?.message}`;
      const drew = r.ops.some((o) => o.op === 'fillText' && String(o.args[0]).includes('HP 3'));
      if (!drew) {
        return `sprite.text = 'HP 3' was stored but never drawn (no fillText carried it). Six lessons label sprites this way in starters AND reference solutions — 5-3-25, 5-3-26, 5-3-27, 5-3-24, 5-3-29 — and the label silently never appears`;
      }
      return true;
    },
  },

  // ---- behaviour, not existence -------------------------------------------
  // The final critic found three checks that asserted a member EXISTS without
  // asserting it does anything. An engine returning false/0/1 from every one of
  // them passed clean. These assert observable values instead.
  {
    name: 'the six collision verbs report real contact, not just exist',
    area: 'collision',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(600,200); world.gravity.y = 0;
          a = new Sprite(100,100,40,40); b = new Sprite(300,100,40,40);
          a.bounciness = 1; b.bounciness = 1; a.vel.x = 8;
          ev = { collides: 0, colliding: 0, collided: 0, maxCount: 0 }; }
        function draw(){
          if (a.collides(b)) ev.collides++;
          const n = a.colliding(b);
          if (n > 0) { ev.colliding++; ev.maxCount = Math.max(ev.maxCount, n); }
          if (a.collided(b)) ev.collided++;
        }
      `, { frames: 200 });
      if (!r.ok) return "sketch threw: " + r.error?.message;
      const e = r.box.sandbox.ev;
      if (e.collides !== 1) return "collides() fired " + e.collides + " times over one contact, expected exactly 1 (start edge)";
      if (e.colliding < 1) return "colliding() never returned a positive frame count during a real contact";
      if (e.collided !== 1) return "collided() fired " + e.collided + " times, expected exactly 1 (end edge)";
      if (e.maxCount < 1) return "colliding() returned " + e.maxCount + " at peak; it must be a frame count, not a boolean";
      return true;
    },
  },
  {
    name: 'mass actually tracks density and size rather than returning a constant',
    area: 'sprite-props',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          small = new Sprite(50,50,20,20);
          big   = new Sprite(150,50,40,40);
          dense = new Sprite(250,50,20,20); dense.density = 4;
          out = { small: small.mass, big: big.mass, dense: dense.mass }; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return "sketch threw: " + r.error?.message;
      const o = r.box.sandbox.out;
      if (!(o.big > o.small)) return "a 40x40 sprite reports mass " + o.big + " and a 20x20 reports " + o.small + "; bigger must weigh more";
      if (!(o.dense > o.small)) return "density 4 gives mass " + o.dense + " vs density 1 giving " + o.small + "; denser must weigh more";
      const ratio = o.dense / o.small;
      if (Math.abs(ratio - 4) > 0.2) return "quadrupling density changed mass by " + ratio.toFixed(2) + "x, expected ~4x";
      return true;
    },
  },
  {
    name: 'speed and direction round-trip through velocity',
    area: 'sprite-props',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(200,200,20,20);
          s.vel.x = 3; s.vel.y = 4;
          fromVel = { speed: s.speed, dir: s.direction };
          t = new Sprite(100,100,20,20);
          t.direction = 90; t.speed = 10;
          fromPolar = { vx: t.vel.x, vy: t.vel.y }; }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return "sketch threw: " + r.error?.message;
      const { fromVel, fromPolar } = r.box.sandbox;
      if (Math.abs(fromVel.speed - 5) > 0.01) return "vel (3,4) gives speed " + fromVel.speed + ", expected 5";
      if (Math.abs(fromVel.dir - 53.13) > 1) return "vel (3,4) gives direction " + fromVel.dir + ", expected ~53.13 degrees";
      if (Math.abs(fromPolar.vx) > 0.01 || Math.abs(fromPolar.vy - 10) > 0.01) {
        return "direction=90 speed=10 gives vel (" + fromPolar.vx.toFixed(2) + "," + fromPolar.vy.toFixed(2) + "), expected (0,10)";
      }
      return true;
    },
  },

  // ---- curriculum contract -------------------------------------------------
  // The corpus half of the gate proves a sketch RUNS; it never inspects where
  // the sprites ended up, so a sketch that runs and behaves absurdly passes.
  // That blind spot hid a live regression: making pressing() return a frame
  // count (correct, matches the reference API) silently broke the movement idiom three
  // lessons taught, and all three kept reporting green.
  //
  // Guard the invariant, not the one line that broke: pressing() returns a
  // RISING COUNT, so no lesson may use it in arithmetic. In a boolean test it
  // is fine and 53 lessons rely on that.
  {
    name: 'no lesson uses kb.pressing() arithmetically (it returns a frame count, not 0/1)',
    area: 'curriculum',
    run() {
      const rf = readFileSync;
      const ARITH = /(?:kb|mouse)\.pressing\([^)]*\)\s*[-+*\/]|[-+*\/]\s*(?:kb|mouse)\.pressing\(/;
      const offenders = [];
      for (const d of readdirSync('lessons')) {
        if (d.startsWith('_')) continue;
        for (const f of ['content.md', 'solution.js', 'script.js']) {
          const fp = join('lessons', d, f);
          if (!existsSync(fp)) continue;
          const t = rf(fp, 'utf8');
          if (ARITH.test(t)) { offenders.push(d + '/' + f); break; }
        }
      }
      if (!offenders.length) return true;
      return "pressing() used in arithmetic by " + offenders.length + " lesson file(s): " +
        offenders.join(', ') + ". It returns a rising frame count, so a subtraction " +
        "like (pressing('right') - pressing('left')) * 4 grows every frame instead of " +
        "giving a steady speed. Use the if/else form 5-1-13-reading-input teaches.";
    },
  },
  {
    name: 'the if/else movement idiom holds a steady speed while a key is held',
    area: 'curriculum',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(400,300); world.gravity.y = 0;
          player = new Sprite(50,150,30,30); }
        function draw(){
          if (kb.pressing('right'))     player.vel.x = 4;
          else if (kb.pressing('left')) player.vel.x = -4;
          else                          player.vel.x = 0;
        }
      `);
      if (box.errors.length) return "sketch threw: " + box.errors[0].message;
      box.pump(1);
      box.input.keyDown('right');
      box.pump(45);
      const vx = box.sandbox.player.vel.x;
      if (Math.abs(vx - 4) > 0.51) {
        return "after 45 frames holding 'right' the taught if/else idiom gives vel.x = " +
          vx.toFixed(2) + ", expected a steady 4";
      }
      return true;
    },
  },

  {
    name: 'all six collision verbs accept a callback and visit every pair',
    area: 'collision',
    // Four of the six got callbacks; overlapping/overlapped kept silently
    // dropping one, and overlapped used .some() -- the same short-circuit bug
    // already fixed on the other verbs. Asymmetry between verbs of the same
    // family is the kind of thing a student hits by pattern-matching.
    run({ runSketch }) {
      const VERBS = ['overlaps', 'overlapping', 'overlapped', 'collides', 'colliding', 'collided'];
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(50,50,20,20); g = new Group(); new g.Sprite(80,50,10);
          sa = {}; ga = {};
          for (const v of ['overlaps','overlapping','overlapped','collides','colliding','collided']) {
            sa[v] = typeof s[v] === 'function' ? s[v].length : -1;
            ga[v] = typeof g[v] === 'function' ? g[v].length : -1;
          }
        }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return "sketch threw: " + r.error?.message;
      const { sa, ga } = r.box.sandbox;
      const bad = [];
      for (const v of VERBS) {
        if (sa[v] < 2) bad.push("Sprite." + v + " (arity " + sa[v] + ")");
        if (ga[v] < 2) bad.push("Group." + v + " (arity " + ga[v] + ")");
      }
      if (bad.length) {
        return bad.join(', ') + " declare no callback parameter. The reference API gives all six " +
          "verbs a (target, callback) form on both Sprite and Group; passing one here is " +
          "silently ignored.";
      }

      // and the callback must actually fire, for every overlapping pair
      const r2 = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          A = new Group(); B = new Group();
          for (let i=0;i<3;i++){ const x = new A.Sprite(200,200,10); x.collider='none';
                                 const y = new B.Sprite(200,200,10); y.collider='none'; }
          hits = { overlaps: 0, overlapping: 0, overlapped: 0 }; }
        function draw(){
          A.overlaps(B,     function(){ hits.overlaps++; });
          A.overlapping(B,  function(){ hits.overlapping++; });
        }
      `, { frames: 3 });
      if (!r2.ok) return "pair sketch threw: " + r2.error?.message;
      const h = r2.box.sandbox.hits;
      if (h.overlaps / 3 !== 9) return "group.overlaps(group, cb) fired " + (h.overlaps / 3) + " pairs/frame, expected 9";
      if (h.overlapping / 3 !== 9) return "group.overlapping(group, cb) fired " + (h.overlapping / 3) + " pairs/frame, expected 9";
      return true;
    },
  },

  // ---- key names ------------------------------------------------------------
  {
    name: 'the key names lessons actually type all resolve',
    area: 'input',
    // The whole existing input suite pressed 'a' -- a single character, which
    // needs no normalisation -- so it never noticed that there WAS no
    // normalisation. kb.pressing('right') read KEYS_['right'] while keydown
    // wrote KEYS_['arrowright']: 166 call sites across 31 lessons, always
    // false, nothing thrown. This check presses real DOM key values and
    // asserts every spelling the corpus uses answers.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        peak = {};
        function setup(){ new Canvas(200,200); }
        function draw(){
          for (const n of ['right','left','up','down','arrowright','ArrowRight',
                           'space',' ','a','w','enter','shift','escape'])
            peak[n] = Math.max(peak[n] || 0, kb.pressing(n));
          peak['kb.space'] = Math.max(peak['kb.space'] || 0, kb.space);
          peak['kb.arrowRight'] = Math.max(peak['kb.arrowRight'] || 0, kb.arrowRight);
        }
      `);
      box.pump(2);
      for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', ' ', 'w', 'Enter', 'Shift', 'Escape'])
        box.input.keyDown(k);
      box.pump(4);
      const peak = box.sandbox.peak;
      // 'a' is the control: never pressed, so it must stay 0. Without it a
      // normaliser that returned a constant truthy value would pass.
      if (peak.a !== 0) return "kb.pressing('a') reported " + peak.a + " but 'a' was never pressed";
      const dead = Object.entries(peak).filter(([k, v]) => k !== 'a' && !(v > 0)).map(([k]) => k);
      if (dead.length) {
        return dead.join(', ') + " read as not-pressed while the key WAS down. " +
          "Key names need normalising ('space' -> ' ', 'right' -> the arrow's " +
          "direction alias) before KEYS_ is indexed.";
      }
      return true;
    },
  },
  {
    name: 'pressing an arrow or its WASD twin both answer the direction name',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        peak = { leftFromA: 0, a: 0, upFromArrow: 0 };
        function setup(){ new Canvas(200,200); }
        function draw(){
          peak.leftFromA = Math.max(peak.leftFromA, kb.pressing('left'));
          peak.a = Math.max(peak.a, kb.pressing('a'));
          peak.upFromArrow = Math.max(peak.upFromArrow, kb.pressing('up'));
        }
      `);
      box.pump(2);
      box.input.keyDown('a');
      box.input.keyDown('ArrowUp');
      box.pump(3);
      const p = box.sandbox.peak;
      if (!(p.a > 0)) return "pressing 'a' did not register as 'a'";
      if (!(p.leftFromA > 0)) return "pressing 'a' did not also register as 'left' (the reference API's _simpleKeyControls)";
      if (!(p.upFromArrow > 0)) return "pressing ArrowUp did not register as 'up'";
      return true;
    },
  },
  {
    name: 'releasing one of two keys feeding a direction keeps the direction held',
    area: 'input',
    // ArrowRight and 'd' both mean 'right'. Releasing 'd' while the arrow is
    // still down must not stop the player. The reference API releases the shared alias
    // unconditionally and DOES break here; this is a deliberate divergence
    // (D16), so the check is a real gate, not informational.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        log = [];
        function setup(){ new Canvas(200,200); }
        function draw(){ log.push(kb.pressing('right')); }
      `);
      box.pump(1);
      box.input.keyDown('ArrowRight');
      box.input.keyDown('d');
      box.pump(3);
      box.input.keyUp('d'); // ArrowRight is still physically down
      box.pump(3);
      const tail = box.sandbox.log.slice(-2);
      if (tail.some((v) => !(v > 0))) {
        return "'right' dropped to " + JSON.stringify(tail) + " after releasing 'd', but " +
          'ArrowRight was never released — the shared direction alias needs to stay held ' +
          'while any key feeding it is down.';
      }
      // and it must keep COUNTING, not restart — charge-up timers read this
      if (tail[1] !== tail[0] + 1) {
        return 'the hold count restarted (' + JSON.stringify(tail) + ') instead of continuing';
      }
      return true;
    },
  },
  {
    name: 'presses/holds/held stay single-shot on a shared direction alias',
    area: 'input',
    // The direction alias is a SECOND counter, so every edge-triggered verb
    // reads it, not just pressing(). Two keys feeding it could plausibly
    // double-fire presses() or re-arm the hold threshold; neither may happen.
    run({ createSandbox }) {
      const drive = (script) => {
        const box = createSandbox();
        box.run(`
          fires = 0; holdsFired = 0; heldFired = 0;
          function setup(){ new Canvas(200,200); }
          function draw(){ if (kb.presses('right')) fires++;
                           if (kb.holds('right')) holdsFired++;
                           if (kb.held('right')) heldFired++; }
        `);
        box.pump(1);
        script(box);
        box.pump(3);
        return box.sandbox;
      };

      const overlap = drive((b) => {
        b.input.keyDown('ArrowRight'); b.pump(1);
        b.input.keyDown('d'); b.pump(2);           // second key joins mid-hold
        b.input.keyUp('d'); b.input.keyUp('ArrowRight');
      });
      if (overlap.fires !== 1)
        return "presses('right') fired " + overlap.fires + " times when a second key joined " +
          'an existing hold; it must fire once per genuine press';

      const separate = drive((b) => {
        b.input.keyDown('d'); b.pump(2); b.input.keyUp('d'); b.pump(2);
        b.input.keyDown('ArrowRight'); b.pump(2); b.input.keyUp('ArrowRight');
      });
      if (separate.fires !== 2)
        return "presses('right') fired " + separate.fires + ' times across two separate presses, expected 2';

      const long = drive((b) => { b.input.keyDown('ArrowRight'); b.pump(20); b.input.keyUp('ArrowRight'); });
      if (long.holdsFired !== 1) return "holds('right') fired " + long.holdsFired + ' times over one long hold, expected 1';
      if (long.heldFired !== 1) return "held('right') fired " + long.heldFired + ' times after one long hold, expected 1';
      return true;
    },
  },
  {
    name: 'a released key stops reading as pressed on the next frame',
    area: 'input',
    // Guards the decay half of the fix: the direction ALIAS is a second
    // counter, and if keyup only released the real key the alias would stay
    // stuck high forever -- a held-down-looking key nobody is touching.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        log = [];
        function setup(){ new Canvas(200,200); }
        function draw(){ log.push(kb.pressing('right')); }
      `);
      box.pump(2);
      box.input.keyDown('ArrowRight');
      box.pump(3);
      box.input.keyUp('ArrowRight');
      box.pump(3);
      const tail = box.sandbox.log.slice(-2);
      if (tail.some((v) => v !== 0)) {
        return "'right' still read as " + JSON.stringify(tail) + " after ArrowRight was released — " +
          "the direction alias is not being decayed by keyup/the frame sweep";
      }
      return true;
    },
  },
  {
    name: 'mouse.left/right track one button each, mouse.pos reads the cursor',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        peak = { any: 0, left: 0, right: 0 };
        function setup(){ new Canvas(200,200); }
        function draw(){
          peak.any = Math.max(peak.any, mouse.pressing());
          peak.left = Math.max(peak.left, mouse.left);
          peak.right = Math.max(peak.right, mouse.right);
          if (frameCount === 3) pos = mouse.pos;
        }
      `);
      box.pump(2);
      box.input.mouseMove(40, 60);
      box.input.mouseDown();
      box.pump(4);
      const p = box.sandbox.peak;
      if (!(p.left > 0)) return 'mouse.left stayed 0 through a left-button press';
      if (p.right !== 0) return 'mouse.right reported ' + p.right + ' but the right button was never pressed';
      if (!(p.any > 0)) return 'mouse.pressing() regressed — it must stay "any button"';
      const pos = box.sandbox.pos;
      if (!pos || pos.x !== 40 || pos.y !== 60) return 'mouse.pos was ' + JSON.stringify(pos) + ', expected {x:40,y:60}';
      return true;
    },
  },
  {
    name: 'mouse.x is world space, mouse.canvasPos is screen space',
    area: 'input',
    // The two only differ once the camera moves, which is why a HUD hit-test
    // written against mouse.x looks correct in every non-scrolling test and
    // then silently answers wrong in the one game that scrolls.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(400,400); }
        function draw(){
          if (frameCount === 3) still = { world: mouse.x, screen: mouse.canvasPos.x };
          if (frameCount === 7) moved = { world: mouse.x, screen: mouse.canvasPos.x };
        }
      `);
      box.pump(1);
      box.input.mouseMove(120, 90);
      box.pump(3);
      box.sandbox.camera.x = 500;
      box.input.mouseMove(120, 90);
      box.pump(4);
      const { still, moved } = box.sandbox;
      if (!still || !moved) return 'probe never ran';
      if (still.world !== 120 || still.screen !== 120)
        return 'with the camera at the origin both should read 120, got ' + JSON.stringify(still);
      // camera.x is the world point the viewport is CENTRED on, so the world
      // coordinate under a screen pixel is pixel + (camera.x - canvas.w / 2).
      // Canvas is 400 wide and the camera is at 500, so the left edge is at
      // world 300 and the pixel 120 is world 420.
      if (moved.world !== 420) return 'mouse.x should follow the camera (420), got ' + moved.world;
      if (moved.screen !== 120)
        return 'mouse.canvasPos.x should stay at the screen pixel 120 regardless of the camera, got ' + moved.screen;
      return true;
    },
  },

  {
    name: 'kb.space exposes the raw signed counter, matching the reference API',
    area: 'input',
    informational: true,
    // The reference API's named-key properties ARE the raw counter, so on the release
    // frame kb.space is -1 or -2 — both truthy. `if (kb.space) jump()` there
    // fires a second time on key-UP. Ours returns kb.pressing()'s value
    // instead (0 or the held count), so the release frame reads 0.
    //
    // This is the same trap as D12, caught before it shipped rather than
    // after: a value that behaves in `if (...)` right up until the edge case.
    // The check is informational because we intend to fail it.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        onRelease = null;
        function setup(){ new Canvas(200,200); }
        function draw(){ if (releasedThisFrame) onRelease = kb.space; }
      `);
      box.sandbox.releasedThisFrame = false;
      box.pump(2);
      box.input.keyDown(' ');
      box.pump(3);
      box.input.keyUp(' ');
      box.sandbox.releasedThisFrame = true;
      box.pump(1);
      const v = box.sandbox.onRelease;
      if (v === -1 || v === -2) return true;
      return 'kb.space read ' + v + ' on the release frame; the reference API would give -1 or -2 ' +
        '(truthy). moSHion returns kb.pressing()\'s value so `if (kb.space)` cannot ' +
        'double-fire on key-up — deliberate, D13.';
    },
  },

  // ---- aliases and family holes ---------------------------------------------
  {
    name: 'sprite size/velocity aliases read AND write the same numbers',
    area: 'sprite',
    // Asserting the alias merely exists would pass on a getter that returns
    // undefined, so every one is read back against the property it mirrors
    // and then written through.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(100,100,40,60);
          read = { width:s.width, height:s.height, hw:s.hw, hh:s.hh,
                   halfWidth:s.halfWidth, halfHeight:s.halfHeight };
          s.width = 80; s.height = 20;
          wrote = { w:s.w, h:s.h };
          c = new Sprite(200,200,30); c.diameter = 30;
          circle = { d:c.d, r:c.r, radius:c.radius };
          c.r = 20; radiusWrote = c.diameter;
          s.velocity = { x:3, y:-2 };
          vel = { x:s.vel.x, y:s.vel.y, viaAlias:s.velocity.x };
        }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      const want = { width: 40, height: 60, hw: 20, hh: 30, halfWidth: 20, halfHeight: 30 };
      for (const [k, v] of Object.entries(want))
        if (b.read[k] !== v) return 'sprite.' + k + ' read ' + b.read[k] + ', expected ' + v;
      if (b.wrote.w !== 80 || b.wrote.h !== 20) return 'writing .width/.height did not reach .w/.h: ' + JSON.stringify(b.wrote);
      if (b.circle.d !== 30 || b.circle.r !== 15 || b.circle.radius !== 15)
        return 'circle aliases wrong: ' + JSON.stringify(b.circle);
      if (b.radiusWrote !== 40) return 'writing .r gave diameter ' + b.radiusWrote + ', expected 40';
      if (b.vel.x !== 3 || b.vel.y !== -2 || b.vel.viaAlias !== 3)
        return '.velocity did not round-trip through .vel: ' + JSON.stringify(b.vel);
      return true;
    },
  },
  {
    name: 'moveAway / attractTo / repelFrom / rotateTowards exist and act',
    area: 'sprite',
    // Each is the opposite or sibling of something the course already teaches,
    // so a student reaches for it by symmetry. Note moveAway is DECLARED but
    // never implemented in the reference API itself — ours is written to the documented
    // meaning, so this check is the only spec it has.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          m = new Sprite(0,0,10); m.collider='none';
          tgt = new Sprite(100,0,10); tgt.collider='none';
          m.moveTowards(tgt, 0.5); towards = Math.round(m.x);
          m.moveAway(tgt, 0.5);    away = Math.round(m.x);
          p = new Sprite(200,300,20); p.attractTo(400,300,50);
          q = new Sprite(200,350,20); q.repelFrom(400,350,50);
          rot = new Sprite(300,100,20); rot.rotation = 0; rot.rotateTowards(90, 0.5);
          spin = Math.round(rot.angularVelocity); snapped = Math.round(rot.rotation);
        }
        function draw(){ if (frameCount===4){ pull = p.vel.x; push = q.vel.x; } }
      `, { frames: 6 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      // object target: moveTowards(sprite) is the form students write
      if (b.towards !== 50) return 'moveTowards(sprite, 0.5) from x=0 to x=100 gave ' + b.towards + ', expected 50';
      if (b.away !== 25) return 'moveAway(sprite, 0.5) gave ' + b.away + ', expected 25';
      if (!(b.pull > 0)) return 'attractTo did not pull toward the target (vel.x ' + b.pull + ')';
      if (!(b.push < 0)) return 'repelFrom did not push away (vel.x ' + b.push + ')';
      // rotateTowards sets a spin; it must NOT snap like rotateTo does
      if (b.spin !== 45) return 'rotateTowards(90, 0.5) set angularVelocity ' + b.spin + ', expected 45';
      if (b.snapped !== 0) return 'rotateTowards snapped rotation to ' + b.snapped + ' — it should spin, not jump';
      return true;
    },
  },
  {
    name: 'distanceTo / angleTo / scaleBy',
    area: 'sprite',
    // distanceTo is the name 5-3-16-reading-methods-intro uses to teach what
    // a method IS, on a hand-rolled class. Students meet the word before they
    // meet a sprite that has it, so it has to be there when they try it.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          a = new Sprite(0,0,10); b = new Sprite(30,40,10);
          dPair = a.distanceTo(30,40); dObj = a.distanceTo(b);
          angRight = a.angleTo(100,0); angDown = a.angleTo(0,100); angObj = a.angleTo(b);
          s = new Sprite(200,200,40,40);
          s.scaleBy(2);      one = { x:s.scale.x, y:s.scale.y };
          s.scaleBy(1.5, 3); two = { x:s.scale.x, y:s.scale.y };
          collider = { w:s.w, h:s.h };
        }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.dPair !== 50) return 'distanceTo(30,40) from (0,0) gave ' + b.dPair + ', expected 50';
      if (b.dObj !== 50) return 'distanceTo(sprite) gave ' + b.dObj + ', expected 50 (same target as the pair form)';
      // angles share sprite.rotation's convention: 0 is +x, 90 is +y (down)
      if (b.angRight !== 0) return 'angleTo a point to the right gave ' + b.angRight + ', expected 0';
      if (b.angDown !== 90) return 'angleTo a point below gave ' + b.angDown + ', expected 90';
      if (Math.abs(b.angObj - 53.13010235) > 1e-6) return 'angleTo(sprite) gave ' + b.angObj + ', expected ~53.13';
      // scaleBy MULTIPLIES — the whole point of it existing next to .scale
      if (b.one.x !== 2 || b.one.y !== 2) return 'scaleBy(2) gave ' + JSON.stringify(b.one) + ', expected {x:2,y:2}';
      if (b.two.x !== 3 || b.two.y !== 6)
        return 'scaleBy(1.5,3) after scaleBy(2) gave ' + JSON.stringify(b.two) +
          ', expected {x:3,y:6} — it must compound, not replace';
      if (b.collider.w !== 40 || b.collider.h !== 40)
        return 'scaleBy changed the collider to ' + JSON.stringify(b.collider) + '; it scales the art only';
      return true;
    },
  },
  {
    name: 'sprite.scale takes a number or an {x,y}, and never reaches zero',
    area: 'sprite',
    // Two separate silent-vanish bugs live here. `scale = 2` used to replace
    // the {x,y} object with a number, so ctx.scale(undefined, undefined) set a
    // NaN transform. `scale = 0` is the finite-number version of the same
    // thing: a degenerate matrix, so nothing draws after it. Neither throws in
    // a browser; the sprite just stops appearing.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(200,200,40,40);
          s.scale = 2;           uniform = { x:s.scale.x, y:s.scale.y };
          s.scale.x = -1;        mirrored = { x:s.scale.x, y:s.scale.y };
          s.scale = { y: 0.5 };  partial = { x:s.scale.x, y:s.scale.y };
          s.scale = 0;           zero = { x:s.scale.x, y:s.scale.y };
          s.scale = 1; s.scaleBy(0); byZero = { x:s.scale.x, y:s.scale.y };
          s.scale = [3, 4];      arr = { x:s.scale.x, y:s.scale.y };
          s.scale = [0, 0];      arrZero = { x:s.scale.x, y:s.scale.y };
        }
        function draw(){}
      `, { frames: 6 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.uniform.x !== 2 || b.uniform.y !== 2)
        return 'scale = 2 gave ' + JSON.stringify(b.uniform) + ' — the uniform form the docs describe must set both axes';
      if (b.mirrored.x !== -1 || b.mirrored.y !== 2)
        return 'scale.x = -1 gave ' + JSON.stringify(b.mirrored) + '; 6-4-5 and 6-4-19 mirror sprites this way';
      if (b.partial.x !== -1 || b.partial.y !== 0.5)
        return 'scale = {y:0.5} gave ' + JSON.stringify(b.partial) + ' — a partial object must leave the other axis alone';
      // the clamp: 0 must never reach the canvas transform
      if (b.zero.x === 0 || b.zero.y === 0)
        return 'scale = 0 left ' + JSON.stringify(b.zero) + '; ctx.scale(0,0) is a degenerate matrix and ' +
          'a browser draws nothing after it. The reference API clamps to 0.01 (the reference implementation).';
      if (b.byZero.x === 0 || b.byZero.y === 0)
        return 'scaleBy(0) left ' + JSON.stringify(b.byZero) + ' — it must route through the same clamp as the setter';
      // the array form the reference API's own typings advertise
      if (b.arr.x !== 3 || b.arr.y !== 4)
        return 'scale = [3,4] gave ' + JSON.stringify(b.arr) + ' — the array form must work, not silently no-op';
      if (b.arrZero.x === 0 || b.arrZero.y === 0)
        return 'scale = [0,0] left ' + JSON.stringify(b.arrZero) + '; the array form needs the same zero-clamp. ' +
          "The reference API misses this — its object/array branch uses ?? , which does not catch literal 0.";
      // and no ctx.scale op may carry a 0 or non-finite argument
      const bad = r.box.ops.filter(
        (o) => o.op === 'scale' && o.args.some((a) => typeof a !== 'number' || !Number.isFinite(a) || a === 0)
      );
      if (bad.length) return bad.length + ' ctx.scale() call(s) reached the canvas with a 0 or non-finite argument';
      return true;
    },
  },
  {
    name: 'rotateTowards always turns the short way, including past 180 degrees',
    area: 'sprite',
    // The original check for rotateTowards used 90 degrees, which is inside
    // the range where shortest-path and the reference API's raw delta AGREE -- so it
    // passed while a real divergence sat underneath it. These are the angles
    // that disagree. Deliberate divergence, D17: the reference API normalises only its
    // object form, so rotateTowards(350) there spins the long way round.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          out = {};
          for (const t of [90, 350, 181, 179, -270]) {
            const s = new Sprite(200,200,20); s.rotation = 0; s.rotateTowards(t, 0.1);
            out[t] = Math.round(s.angularVelocity * 100) / 100;
          }
        }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const out = r.box.sandbox.out;
      // shortest signed delta from 0, times tracking 0.1
      const want = { 90: 9, 350: -1, 181: -17.9, 179: 17.9, '-270': 9 };
      for (const [target, expected] of Object.entries(want)) {
        const got = out[target];
        if (Math.abs(got - expected) > 1e-6) {
          return 'rotateTowards(' + target + ', 0.1) from rotation 0 set angularVelocity ' + got +
            ', expected ' + expected + '. A raw (unnormalised) delta would give ' +
            Math.round(Number(target) * 0.1 * 100) / 100 + ' — that is the reference API\'s plain-number ' +
            'behaviour and we deliberately do not match it (D17).';
        }
      }
      return true;
    },
  },
  {
    name: 'a move/attract target of `mouse` is ignored until the cursor moves',
    area: 'input',
    // mouse.x/y are 0 until the browser reports a position, and (0,0) is a
    // real canvas coordinate — so an unguarded attractTo(mouse) drags the
    // sprite into the corner on frame 1 of a sketch nobody has touched.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(200,200,20); s.collider = 'none';
          activeAtStart = mouse.isActive;
        }
        function draw(){
          s.moveTowards(mouse, 0.5);
          if (frameCount === 3) beforeMove = { x: Math.round(s.x), y: Math.round(s.y) };
          if (frameCount === 8) afterMove = { x: Math.round(s.x), y: Math.round(s.y) };
        }
      `);
      box.pump(4);
      const b = box.sandbox;
      if (b.activeAtStart !== false) return 'mouse.isActive should start false, was ' + b.activeAtStart;
      if (!b.beforeMove || b.beforeMove.x !== 200 || b.beforeMove.y !== 200)
        return 'the sprite moved to ' + JSON.stringify(b.beforeMove) + ' before the cursor was ever reported; ' +
          'it should have stayed at (200,200)';
      // once the cursor is real, the target must take effect
      box.input.mouseMove(0, 0);
      box.pump(5);
      if (!b.afterMove || b.afterMove.x === 200)
        return 'after a real mousemove the sprite did not move (' + JSON.stringify(b.afterMove) +
          ') — the guard is too broad and is suppressing a live target';
      return true;
    },
  },
  {
    name: 'group.cull removes off-screen members and honours a callback',
    area: 'group',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          g = new Group();
          for (const x of [-99, 200, 555]) { const s = new g.Sprite(x,200,10); s.collider='none'; }
          culled = g.cull(0); left = g.length; survivor = g.length ? Math.round(g[0].x) : null;
          h = new Group();
          for (const x of [-99, 555]) { const s = new h.Sprite(x,200,10); s.collider='none'; }
          wrapped = 0; h.cull(0, (s) => { wrapped++; s.x = 200; }); hLeft = h.length;
          // a margin keeps sprites that are only just outside
          k = new Group(); const ks = new k.Sprite(-30,200,10); ks.collider='none';
          keptByMargin = k.cull(50);
        }
        function draw(){}
      `, { frames: 2 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.culled !== 2) return 'cull(0) reported ' + b.culled + ' culled, expected 2';
      if (b.left !== 1 || b.survivor !== 200) return 'cull kept ' + b.left + ' member(s), survivor x=' + b.survivor + '; expected 1 at x=200';
      if (b.wrapped !== 2) return 'cull(0, cb) ran the callback ' + b.wrapped + ' times, expected 2';
      if (b.hLeft !== 2) return 'cull(0, cb) deleted ' + (2 - b.hLeft) + ' sprite(s) — with a callback it must delete none';
      if (b.keptByMargin !== 0) return 'cull(50) culled a sprite 30px outside the canvas; the margin was ignored';
      return true;
    },
  },
  {
    name: 'group cascades applyForce / moveTowards to every member',
    area: 'group',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          m = new Group();
          for (let i=0;i<3;i++){ const s = new m.Sprite(50, 50+i*20, 10); s.collider='none'; }
          m.moveTowards(250, 50, 0.5); moved = m.map(s => Math.round(s.x));
          f = new Group();
          for (let i=0;i<2;i++) new f.Sprite(200, 100+i*40, 20);
          f.applyForce(100, 0);
        }
        function draw(){ if (frameCount===4) forced = f.map(s => s.vel.x); }
      `, { frames: 6 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (!b.moved || b.moved.some((x) => x !== 150))
        return 'group.moveTowards left members at x=' + JSON.stringify(b.moved) + ', expected every one at 150';
      if (!b.forced || b.forced.some((v) => !(v > 0)))
        return 'group.applyForce left member velocities at ' + JSON.stringify(b.forced) + ' — every member must be pushed';
      return true;
    },
  },

  // ---- textures -----------------------------------------------------------
  {
    name: 'sprite.texture resolves a built-in name to a real file and draws it',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          a = new Sprite(50, 50, 50, 50); a.texture = 'coin';
          names = textureNames(); had = hasTexture('coin'); nope = hasTexture('definitelyNot'); }
        function draw(){ background('#222'); }
      `, { frames: 2 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.a.texture !== 'coin') return 'sprite.texture read back as ' + JSON.stringify(b.a.texture) + ', expected "coin"';
      if (!b.had) return "hasTexture('coin') was false — the built-in catalog did not load";
      if (b.nope) return 'hasTexture() returned true for a name that does not exist';
      if (!b.names || b.names.length < 10) return 'textureNames() returned ' + (b.names ? b.names.length : 'nothing') + ' names';
      const drew = r.ops.filter((o) => o.op === 'drawImage' && String(o.args[0]).includes('/moshion/textures/coin.png'));
      // The whole point: a texture that resolves but never reaches drawImage
      // is the "pipeline with nothing at the top" this repo keeps shipping.
      return drew.length ? true : 'sprite.texture = "coin" drew no image; drawImage ops were ' +
        JSON.stringify(r.ops.filter((o) => o.op === 'drawImage').map((o) => o.args[0]));
    },
  },
  {
    name: 'an unknown texture name warns instead of failing silently',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          s = new Sprite(100, 100, 50, 50); s.texture = 'Coin'; }
        function draw(){ background('#222'); }
      `, { frames: 2 });
      if (!r.ok) return 'a bad texture name threw instead of warning: ' + r.error?.message;
      const warns = r.console.filter((c) => c.type === 'warn').map((c) => c.text).join(' ');
      if (!/No texture named/.test(warns)) return 'no warning for an unknown texture name; console was ' + JSON.stringify(warns);
      // Near-matches are the difference between a warning and a useful one:
      // wrong case is the single most likely student typo.
      if (!/coin/.test(warns)) return 'the warning for "Coin" suggested no near match: ' + warns;
      return r.box.sandbox.s.texture === null ? true :
        'a rejected name still set sprite.texture to ' + JSON.stringify(r.box.sandbox.s.texture);
    },
  },
  {
    name: 'textures draw with smoothing off, and restore it for ordinary images',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          a = new Sprite(50, 50, 50, 50); a.texture = 'crate';
          b = new Sprite(150, 50, 50, 50); b.image = '/moshion/assets/star.webp'; }
        function draw(){ background('#222'); }
      `, { frames: 1 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      // Pixel art scaled up with smoothing ON arrives as a blur. There is no
      // error and no missing draw -- it just looks wrong, which is why this
      // is asserted on the op sequence rather than left to the eye.
      const seq = r.ops.filter((o) => o.op === 'set:imageSmoothingEnabled' || o.op === 'drawImage');
      const i = seq.findIndex((o) => o.op === 'drawImage' && String(o.args[0]).includes('/textures/crate.png'));
      if (i === -1) return 'the crate texture never reached drawImage';
      const beforeTex = seq[i - 1];
      if (!beforeTex || beforeTex.op !== 'set:imageSmoothingEnabled' || beforeTex.args[0] !== false) {
        return 'texture drawn without turning imageSmoothingEnabled off first; preceding op was ' + JSON.stringify(beforeTex);
      }
      const j = seq.findIndex((o) => o.op === 'drawImage' && String(o.args[0]).includes('star.webp'));
      if (j === -1) return 'the .image sprite never reached drawImage';
      const beforeImg = seq[j - 1];
      if (beforeImg && beforeImg.op === 'set:imageSmoothingEnabled' && beforeImg.args[0] === false) {
        return 'a plain .image was drawn with smoothing still off — the texture path leaked its state';
      }
      return true;
    },
  },
  {
    name: 'saveTexture round-trips, is listed, and shadows a built-in of the same name',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          saveTexture('mine', 'data:image/png;base64,iVBORw0KGgo=');
          a = new Sprite(50, 50, 50, 50); a.texture = 'mine';
          listed = textureNames().indexOf('mine') !== -1;
          saveTexture('coin', 'data:image/png;base64,SHADOWED=');
          b = new Sprite(150, 50, 50, 50); b.texture = 'coin';
          try { saveTexture('bad', 'not-a-data-url'); threw = false; } catch (e) { threw = true; }
        }
        function draw(){ background('#222'); }
      `, { frames: 2 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.a.texture !== 'mine') return 'a saved texture did not set sprite.texture; got ' + JSON.stringify(b.a.texture);
      if (!b.listed) return 'a saved texture was not in textureNames() — the editor could save art nothing can find';
      if (!b.threw) return 'saveTexture accepted a value that is not a data: URL';
      const srcs = r.ops.filter((o) => o.op === 'drawImage').map((o) => String(o.args[0]));
      if (!srcs.some((sx) => sx.includes('iVBORw0KGgo='))) return 'the saved texture never reached drawImage; sources were ' + JSON.stringify(srcs);
      if (!srcs.some((sx) => sx.includes('SHADOWED='))) {
        return 'a saved texture named "coin" did not shadow the built-in; sources were ' + JSON.stringify(srcs);
      }
      return true;
    },
  },
  {
    name: 'texture, image and ani stay mutually exclusive',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          a = new Sprite(50, 50, 50, 50); a.texture = 'crate'; a.image = '/moshion/assets/star.webp';
          afterImage = a.texture;
          b = new Sprite(100, 50, 50, 50); b.texture = 'gem'; b.addAni('x', '/moshion/assets/ghost_fly.avif', 4);
          afterAni = b.texture;
          c = new Sprite(150, 50, 50, 50); c.texture = 'coin'; c.texture = null;
          afterNull = c.texture; }
        function draw(){ background('#222'); }
      `, { frames: 2 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.afterImage !== null) return 'setting .image left .texture at ' + JSON.stringify(b.afterImage);
      if (b.afterAni !== null) return 'addAni() left .texture at ' + JSON.stringify(b.afterAni);
      if (b.afterNull !== null) return 'texture = null left .texture at ' + JSON.stringify(b.afterNull);
      return true;
    },
  },

  {
    name: 'a saved multi-frame texture animates, and a still saved over it stops animating',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(300,200);
          saveTexture('walk', 'data:image/png;base64,STRIP4=', { frames: 4, frameDelay: 2 });
          a = new Sprite(80, 100, 50, 50); a.collider='none'; a.texture = 'walk';
          isAni = !!a.ani; count = a.ani ? a.ani.frameCount : 0;
          delay = a.ani ? a.ani.frameDelay : 0; stillImg = a._img;

          saveTexture('walk', 'data:image/png;base64,STILL=');
          b = new Sprite(200, 100, 50, 50); b.collider='none'; b.texture = 'walk';
          bIsAni = !!b.ani;

          leaked = textureNames().filter(function(n){ return n.indexOf('texmeta') === 0; });
        }
        function draw(){ background('#222'); if (frameCount === 8) advanced = a.ani.frame; }
      `, { frames: 10 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (!b.isAni) return 'a texture saved with frames:4 did not become an animation';
      if (b.count !== 4) return 'frameCount was ' + b.count + ', expected 4';
      if (b.delay !== 2) return 'frameDelay was ' + b.delay + ', expected 2';
      if (b.stillImg !== null) return 'the animated path left a still _img set; both would draw';
      // Without this, a "4-frame" texture that never advances looks like a
      // still and nothing fails.
      if (!(b.advanced > 0)) return 'the animation never advanced a frame (frame=' + b.advanced + ')';
      // Saving a still over an animation must drop the frame count, or the
      // still is sliced into 4 and only a sliver ever draws.
      if (b.bIsAni) return 'saving a still over an animation left the old frame count in place';
      if (b.leaked && b.leaked.length) return 'texmeta keys leaked into textureNames(): ' + JSON.stringify(b.leaked);
      // The slice geometry: source x must be frame * (width / frameCount).
      const sliced = r.ops.filter((o) => o.op === 'drawImage' && o.args.length === 9 && String(o.args[0]).includes('STRIP4'));
      if (!sliced.length) return 'the animated texture never drew a sliced frame';
      const widths = new Set(sliced.map((o) => o.args[3]));
      if (widths.size !== 1) return 'frame width varied between draws: ' + JSON.stringify([...widths]);
      return true;
    },
  },
  {
    name: 'an animated texture draws with smoothing off, like a still one',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(300,200);
          saveTexture('walk', 'data:image/png;base64,STRIP2=', { frames: 2, frameDelay: 2 });
          a = new Sprite(80, 100, 50, 50); a.collider='none'; a.texture = 'walk';
          b = new Sprite(200, 100, 50, 50); b.collider='none';
          b.addAni('plain', '/moshion/assets/ghost_fly.avif', 4);
        }
        function draw(){ background('#222'); }
      `, { frames: 1 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const seq = r.ops.filter((o) => o.op === 'set:imageSmoothingEnabled' || o.op === 'drawImage');
      const i = seq.findIndex((o) => o.op === 'drawImage' && String(o.args[0]).includes('STRIP2'));
      if (i === -1) return 'the animated texture never reached drawImage';
      const before = seq[i - 1];
      if (!before || before.op !== 'set:imageSmoothingEnabled' || before.args[0] !== false) {
        return 'animated texture drawn without smoothing off; preceding op was ' + JSON.stringify(before);
      }
      // addAni() art is NOT a texture and must keep smoothing -- the opt-in is
      // "came from .texture", not "is animated".
      const j = seq.findIndex((o) => o.op === 'drawImage' && String(o.args[0]).includes('ghost_fly'));
      if (j !== -1) {
        const bj = seq[j - 1];
        if (bj && bj.op === 'set:imageSmoothingEnabled' && bj.args[0] === false) {
          return 'a plain addAni() sheet was drawn with smoothing off -- the texture path leaked';
        }
      }
      return true;
    },
  },

  {
    name: 'per-frame durations hold the right frames, and a bad array is ignored',
    area: 'texture',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(200,200);
          saveTexture('hold', 'data:image/png;base64,S3=', { frames: 3, frameDelay: 4, delays: [1, 12, 1] });
          a = new Sprite(60, 100, 40, 40); a.collider='none'; a.texture = 'hold';
          holds = [a.ani.holdOf(0), a.ani.holdOf(1), a.ani.holdOf(2)];

          saveTexture('uni', 'data:image/png;base64,U3=', { frames: 3, frameDelay: 4 });
          u = new Sprite(120, 100, 40, 40); u.collider='none'; u.texture = 'uni';
          uniformDelays = u.ani.frameDelays;

          saveTexture('bad', 'data:image/png;base64,B3=', { frames: 3, frameDelay: 4, delays: [1, 2] });
          x = new Sprite(170, 100, 40, 40); x.collider='none'; x.texture = 'bad';
          badDelays = x.ani.frameDelays; badHold = x.ani.holdOf(0);

          seen = []; useen = [];
        }
        function draw(){ background('#222'); seen.push(a.ani.frame); useen.push(u.ani.frame); }
      `, { frames: 30 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (JSON.stringify(b.holds) !== '[1,12,1]') return 'holdOf() returned ' + JSON.stringify(b.holds) + ', expected [1,12,1]';

      // The point of a per-frame hold is that the long frame is ACTUALLY on
      // screen longer. Asserting only on holdOf() would pass with _advance()
      // still using the uniform delay.
      const count = (arr, f) => arr.filter((x) => x === f).length;
      const long = count(b.seen, 1);
      if (!(long > count(b.seen, 0) + count(b.seen, 2))) {
        return 'the frame with a 12-frame hold was shown ' + long + ' of 30 draws; it should dominate';
      }

      // addAni() and uniform textures must be untouched by any of this.
      if (b.uniformDelays !== null) return 'a uniform animation was given a frameDelays array';
      const spread = [0, 1, 2].map((f) => count(b.useen, f));
      if (Math.max(...spread) - Math.min(...spread) > 4) {
        return 'a uniform animation became uneven: visits were ' + JSON.stringify(spread);
      }

      // A half-written save must not hold the wrong frames.
      if (b.badDelays !== null) return 'a delays array shorter than the frame count was accepted';
      if (b.badHold !== 4) return 'a rejected delays array left holdOf() at ' + b.badHold + ', expected the uniform 4';
      return true;
    },
  },
];
