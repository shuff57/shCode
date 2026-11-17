#!/usr/bin/env node
// Headless checks for a sprite's jumping in the moSHion engine
// (player.jump(ground), maxJumps, jumpPower, jumpsLeft, onGround; upstream
// fcb436b, see public/moshion/VENDORED.md), run through scripts/moshion-harness.mjs.
// The upstream browser spec is tests/jumping.spec.mjs in the moshion repo.
//   1. standing on the ground counts, and every jump is there;
//   2. maxJumps = 2 jumps twice in the air, not three times;
//   3. landing gives the jumps back, even when the sketch never asked while landing;
//   4. walking off a ledge (or starting in the air) uses up the ground jump;
//   5. a wall beside the sprite, and a collider 'none' sprite under it, are not ground;
//   6. a weak jump that leaves the feet in the ground does not get the jump back;
//   7. 'math' mode jumps upward (y up); a group's sprites jump too;
//   8. setting jumpsLeft in mid-air gives jumps back; bad values say what is wrong;
//   9. a sketch's own jump() / onGround still win;
//  11. jumpPower is a height multiplier: 1 rises 120 px, 2 twice that, at any gravity;
//  10. jump(ground) names what refills the jumps: a crate that is not ground does not,
//      a Group works, and a wrong argument says what to pass.
//
// Run: node scripts/test-moshion-jump.mjs

import { createSandbox } from './moshion-harness.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

/** A sketch whose update() calls player.jump() once for each `want` and logs the answers. */
function boot(setupBody, { maxJumps = 2 } = {}) {
  const box = createSandbox();
  box.run(`
    player = null; ground = null;
    want = 0; answers = []; push = 0;
    function setup() {
      new Canvas(400, 400);
      ${setupBody}
      player.maxJumps = ${maxJumps};
    }
    function update() {
      if (push) player.vel.x = push;
      while (want > 0) { want--; answers.push(player.jump()); }
    }
    function draw() {}
  `);
  if (box.errors.length) throw box.errors[0];
  box.pump(1);
  return box;
}

const FLOOR = `
  world.gravity.y = 10;
  player = new Sprite(100, 340, 30, 40);
  player.rotationLock = true;
  ground = new Sprite(200, 380, 400, 20, 'static');
`;

function jumpNow(box) { box.sandbox.want = 1; box.pump(1); return box.sandbox.answers.at(-1); }

// 1-2. Standing, then a double jump and no third; landing gives them back.
{
  const box = boot(FLOOR, { maxJumps: 2 });
  box.pump(60);
  const p = box.sandbox.player;
  check('a sprite resting on the ground is onGround', p.onGround === true, { y: p.y });
  check('standing, every jump is left', p.jumpsLeft === 2, p.jumpsLeft);
  check('first jump goes', jumpNow(box) === true);
  check('the jump goes up (vel.y negative), and jumpPower is 1 by default', p.vel.y < -4 && p.jumpPower === 1, { vy: p.vel.y, power: p.jumpPower });
  box.pump(8);
  check('in the air after one jump, one is left', p.jumpsLeft === 1, p.jumpsLeft);
  check('second jump goes in mid-air', jumpNow(box) === true);
  box.pump(4);
  check('a third jump is refused', jumpNow(box) === false);
  check('no jumps left in the air', p.jumpsLeft === 0, p.jumpsLeft);
  box.pump(500);
  check('landing gives both jumps back', p.jumpsLeft === 2 && p.onGround, { left: p.jumpsLeft, onGround: p.onGround });
}

// 3-4. Double jump, land WITHOUT asking, then walk off a ledge: one jump left of two.
{
  const box = boot(`
    world.gravity.y = 10;
    player = new Sprite(100, 300, 30, 40);
    player.rotationLock = true;
    ground = new Sprite(100, 380, 200, 20, 'static');
  `, { maxJumps: 2 });
  box.pump(60);
  jumpNow(box); box.pump(8); jumpNow(box);
  box.pump(500); // lands; nothing reads the sprite's jumps while it does
  box.sandbox.push = 4;
  box.pump(40); // walks off the ledge at x = 200
  const p = box.sandbox.player;
  check('the sprite walked off the ledge', p.x > 230 && !p.onGround, { x: p.x });
  check('walking off a ledge uses the ground jump (2 -> 1)', p.jumpsLeft === 1, p.jumpsLeft);
}
{
  const box = boot(`
    world.gravity.y = 10;
    player = new Sprite(100, 100, 30, 40);
    ground = new Sprite(200, 380, 400, 20, 'static');
  `, { maxJumps: 1 });
  box.pump(3);
  check('maxJumps 1 cannot jump while falling from the start', jumpNow(box) === false);
}

// 5. A wall beside the sprite is not ground; neither is a collider 'none' sprite under it.
{
  const box = boot(`
    world.gravity.y = 0;
    player = new Sprite(170, 200, 30, 40);
    player.rotationLock = true;
    ground = new Sprite(200, 200, 20, 400, 'static');
  `, { maxJumps: 1 });
  box.sandbox.push = 3;
  box.pump(30);
  const { player, ground } = box.sandbox;
  check('the sprite is pressed against the wall', player.colliding(ground) > 0, { x: player.x });
  check('a wall beside the sprite is not ground', player.onGround === false);
}
{
  const box = boot(`
    world.gravity.y = 0;
    player = new Sprite(200, 200, 30, 40);
    ground = new Sprite(200, 222, 60, 10);
    ground.collider = 'none';
  `, { maxJumps: 1 });
  box.pump(10);
  check("a collider 'none' sprite under the feet is not ground", box.sandbox.player.onGround === false);
}

// 6. A weak jump leaves the feet sensor in the ground for a frame or two: moving up is not standing.
{
  const box = boot(FLOOR, { maxJumps: 1 });
  box.pump(60);
  box.sandbox.player.jumpPower = 0.1; // rises ~12 px: the feet stay near the floor
  check('a weak jump goes', jumpNow(box) === true);
  const again = [jumpNow(box), jumpNow(box), jumpNow(box)];
  check('rising with the feet still touching does not give the jump back', again.every((a) => a === false), again);
}

// 7. 'math' mode jumps toward +y; a group's sprite jumps; a sprite that never jumps gets no sensor.
{
  const box = createSandbox();
  box.run(`
    player = null; bystander = null;
    function setup() {
      new Canvas(400, 400);
      world.origin = 'math';
      world.gravity.y = -10;
      player = new Sprite(0, -100, 30, 40);
      player.rotationLock = true;
      bystander = new Sprite(150, 0, 20, 20, 'static');
      new Sprite(0, -190, 400, 20, 'static');
    }
    function draw() {}
  `);
  box.pump(90);
  const { player, bystander } = box.sandbox;
  check("'math' mode: standing on the ground counts", player.onGround === true, { y: player.y });
  check("'math' mode: the jump goes up (vel.y positive)", player.jump() === true && player.vel.y > 4, player.vel.y);
  check('a sprite that never jumps gets nothing added', !Object.getOwnPropertyNames(bystander).includes('_jumping'));
}
{
  const box = createSandbox();
  box.run(`
    heroes = null; h = null;
    function setup() {
      new Canvas(400, 400);
      world.gravity.y = 10;
      heroes = new Group();
      h = new heroes.Sprite(100, 340, 30, 40);
      h.maxJumps = 3;
      new Sprite(200, 380, 400, 20, 'static');
    }
    function draw() {}
  `);
  box.pump(60);
  check("a group's sprite has the same jumping", box.sandbox.h.jumpsLeft === 3 && box.sandbox.h.jump() === true);
}

// 8. Giving jumps back in the air, and readable errors.
{
  const box = boot(FLOOR, { maxJumps: 2 });
  box.pump(60);
  jumpNow(box); box.pump(8); jumpNow(box); box.pump(4);
  const p = box.sandbox.player;
  p.jumpsLeft = p.maxJumps;
  box.pump(2);
  check('jumpsLeft = maxJumps in mid-air gives every jump back', p.jumpsLeft === 2, p.jumpsLeft);
  p.maxJumps = 3;
  check('maxJumps can be changed later', p.jumpsLeft === 3, p.jumpsLeft);
}
{
  const box = createSandbox();
  box.run(`
    errs = [];
    function setup() {
      new Canvas(200, 200);
      const p = new Sprite(100, 100, 20, 20);
      for (const f of [() => { p.maxJumps = -1; }, () => { p.jumpPower = 'high'; }]) {
        try { f(); errs.push('no error'); } catch (e) { errs.push(e.message); }
      }
    }
    function draw() {}
  `);
  box.pump(1);
  const errs = box.sandbox.errs;
  check('a negative maxJumps is refused', /maxJumps must be a number/.test(errs[0]), errs[0]);
  check('a jumpPower that is not a number is refused', /jumpPower must be a number/.test(errs[1]), errs[1]);
}

// 9. A sketch's own names win.
{
  const box = createSandbox();
  box.run(`
    seen = {};
    class Hero extends Sprite { jump() { return 'mine'; } }
    function setup() {
      new Canvas(200, 200);
      seen.hero = new Hero(100, 100, 20, 20).jump();
      const p = new Sprite(50, 50, 20, 20);
      p.onGround = 'my flag';
      seen.flag = p.onGround;
      p.jump = () => 'own';
      seen.own = p.jump();
    }
    function draw() {}
  `);
  box.pump(1);
  const s = box.sandbox.seen;
  check("a subclass's own jump() wins", s.hero === 'mine', s.hero);
  check("a sketch's own sprite.onGround field reads back what it stored", s.flag === 'my flag', s.flag);
  check("a sketch's own sprite.jump = fn wins", s.own === 'own', s.own);
}

// 10. jump(ground): only the named ground gives jumps back.
function crateSketch(call) {
  const box = createSandbox();
  box.run(`
    player = null; platforms = null; crate = null; answers = []; want = 0;
    function setup() {
      new Canvas(400, 400);
      world.gravity.y = 10;
      platforms = new Group();
      platforms.collider = 'static';
      new platforms.Sprite(100, 380, 200, 20);   // floor on the left
      crate = new Sprite(300, 380, 120, 20, 'static'); // a crate on the right, not ground
      player = new Sprite(300, 330, 30, 40);
      player.rotationLock = true;
    }
    function update() { while (want > 0) { want--; answers.push(${call}); } }
    function draw() {}
  `);
  if (box.errors.length) throw box.errors[0];
  box.pump(60);
  return box;
}
{
  const box = crateSketch('player.jump(platforms)');
  box.sandbox.want = 1; box.pump(1);
  check('jump(platforms) while standing on a crate that is not ground is refused', box.sandbox.answers[0] === false, box.sandbox.answers);
  check('onGround follows the ground given to jump()', box.sandbox.player.onGround === false);
  box.sandbox.player.x = 100; box.sandbox.player.y = 330; box.sandbox.player.vel.y = 0;
  box.pump(60);
  box.sandbox.want = 1; box.pump(1);
  check('jump(platforms) from a sprite in the group goes', box.sandbox.answers[1] === true, box.sandbox.answers);
}
{
  const box = crateSketch('player.jump()');
  box.sandbox.want = 1; box.pump(1);
  check('jump() with nothing still counts any solid sprite (the crate)', box.sandbox.answers[0] === true, box.sandbox.answers);
}
{
  const box = createSandbox();
  box.run(`
    err = null;
    function setup() {
      new Canvas(200, 200);
      const p = new Sprite(100, 100, 20, 20);
      try { p.jump('ground'); } catch (e) { err = e.message; }
    }
    function draw() {}
  `);
  box.pump(1);
  check("jump('ground') (a string) says to pass the sprite or group", /sprite or group it jumps off/.test(box.sandbox.err), box.sandbox.err);
}

// 11. jumpPower is a height multiplier: 1 rises 120 px, 2 rises 240, at any gravity.
function rise(gravity, power, scale = 1) {
  const box = createSandbox();
  box.run(`player = null;
    function setup() {
      new Canvas(400, 3000);
      world.gravity.y = ${gravity};
      new Sprite(200, 2990, 400, 20, 'static');
      player = new Sprite(200, 2960, 24, 32);
      player.rotationLock = true;
      player.gravityScale = ${scale};
      player.jumpPower = ${power};
    }
    function draw() {}`);
  box.pump(240);
  const p = box.sandbox.player;
  const y0 = p.y;
  p.jump();
  let top = y0;
  for (let i = 0; i < 3000; i++) {
    box.pump(1);
    top = Math.min(top, p.y);
    if (p.vel.y > 0 && p.y > top + 1) break;
  }
  return y0 - top;
}
{
  const one = rise(10, 1), two = rise(10, 2), half = rise(10, 0.5);
  check('jumpPower 1 rises 120 px', Math.abs(one - 120) < 1, one);
  check('jumpPower 2 rises twice as high, 0.5 half as high', Math.abs(two - 240) < 1 && Math.abs(half - 60) < 1, { two, half });
  const g30 = rise(30, 1), scaled = rise(10, 1, 2);
  check('the height is the same at gravity 30 and with gravityScale 2', Math.abs(g30 - 120) < 1 && Math.abs(scaled - 120) < 1, { g30, scaled });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
