**Goal:** combine `kb.presses` + `player.colliding(ground)` to build a jump that fires once per landing — the foundation pattern for any platformer.

## Step 1 — Run it

A player sprite under gravity, on a static ground. WASD walks horizontally, space jumps — but **only when touching the ground.** Try jumping mid-air; nothing happens.

```js live
let player, ground;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 20;

  ground = new Sprite(300, 390, 600, 20, 'static');
  ground.color = '#444';

  player = new Sprite(100, 300, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -5;
  else if (kb.pressing('d')) player.vel.x = 5;
  else                       player.vel.x = 0;

  // Only allow jump when in contact with ground.
  // NOTE: pass a literal space ' ' to kb.presses — the string 'space' is not recognized.
  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -12;
  }
}
```

This is the W14 baseline. Internalize this shape — every physics-y game you build from here uses some variant.

## Step 2 — Break it on purpose

Drop the `&& player.colliding(ground)` gate. Now tap space repeatedly while in the air. The player jumps each time — infinite mid-air jumps.

```js live
let player, ground;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 20;
  ground = new Sprite(300, 390, 600, 20, 'static');
  player = new Sprite(100, 300, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -5;
  else if (kb.pressing('d')) player.vel.x = 5;
  else                       player.vel.x = 0;

  // BAD — no ground gate. Player can jump in mid-air.
  if (kb.presses(' ')) {
    player.vel.y = -12;
  }
}
```

Notice that `kb.presses` still works correctly — it fires once per tap. The bug isn't in the input check; it's that we never asked "are we *allowed* to jump right now?" The `colliding` gate answers that.

## Step 3 — Scale to many platforms

Replace the single ground sprite with a Group of platforms. The same jump line works — `player.colliding(platforms)` returns a frame-count that's truthy if the player is currently in contact with **any** platform in the group.

```js live
let player, platforms;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 20;

  platforms = new Group();
  platforms.color = '#444';
  platforms.collider = 'static';

  // Floor + two platforms
  new platforms.Sprite(300, 390, 600, 20);
  new platforms.Sprite(200, 280, 140, 16);
  new platforms.Sprite(420, 200, 140, 16);

  player = new Sprite(100, 300, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -5;
  else if (kb.pressing('d')) player.vel.x = 5;
  else                       player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(platforms)) {
    player.vel.y = -12;
  }
}
```

Walk to a platform, jump up, walk off. The same pattern handles every surface in the level.

## Step 4 — Tune the feel

Three knobs: `world.gravity.y`, the jump impulse magnitude, and horizontal `vel.x`. Try the three combos below and notice how the *feel* changes without changing any code structure.

```js live
let player, ground;

function setup() {
  new Canvas(600, 400);
  // Floaty: low gravity, low impulse.
  world.gravity.y = 8;
  ground = new Sprite(300, 390, 600, 20, 'static');
  player = new Sprite(100, 300, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -5;
  else if (kb.pressing('d')) player.vel.x = 5;
  else                       player.vel.x = 0;

  // Tune impulse to taste — try -8 (light), -12 (default), -18 (heavy).
  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -10;
  }
}
```

When tuning, change **one** value at a time. If you change gravity AND impulse together and it still feels wrong, you can't tell which one was the problem.

## Key takeaways

- The ground-gated jump pattern is one line: `if (kb.presses(' ') && player.colliding(ground)) player.vel.y = -<n>;`. The space arg must be a literal space character — `'space'` is not recognized.
- `kb.presses` handles "fire once per tap." `colliding` handles "are you allowed to fire?" Both gates matter.
- `colliding` works with a single sprite OR a Group — same idiom, scales for free.
- Tune gravity, jump impulse, and run speed **one knob at a time** — otherwise you can't tell which one fixed the feel.
- This is the foundation for `6.3.9 Space Jumper`. Internalize it before starting the lab.
