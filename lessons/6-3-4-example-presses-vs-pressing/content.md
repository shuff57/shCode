**Goal:** see the super-jump bug live, understand *why* `kb.pressing` for a one-shot action breaks, then fix it with `kb.presses`.

## Step 1 — Run the BAD version

A player sprite under gravity, sitting on a static ground. Holding space should make the player jump once. Watch what happens.

```js live
let player, ground;

function setup() {
  new Canvas(400, 280);
  world.gravity.y = 20;

  ground = new Sprite(200, 270, 400, 12, 'static');
  ground.color = '#444';

  player = new Sprite(60, 100, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  // BAD — kb.pressing for a one-shot action.
  if (kb.pressing('space')) player.vel.y = -10;

  fill('white');
  textSize(14);
  text('hold SPACE — watch the super-jump', 14, 24);
}
```

Click to focus, then hold the space bar. The player rockets up forever — `vel.y = -10` runs every frame the key is held (~60 times per second).

## Step 2 — Why does it happen?

`kb.pressing('space')` returns `true` for every frame the key is held. The `if` body fires every one of those frames. Each call resets `vel.y = -10`, overriding gravity's pull. The result: continuous upward acceleration.

The same shape would break for shooting (60 bullets per second from one tap), toggling a UI panel (flickers as long as the key is held), or starting a sound (60 overlapping sound starts per second).

## Step 3 — Fix it with `kb.presses`

Change exactly one word: `kb.pressing` → `kb.presses`. The edge-triggered form fires only on the frame where the key transitions from "not held" to "held" — once per tap, no matter how long you hold.

```js live
let player, ground;

function setup() {
  new Canvas(400, 280);
  world.gravity.y = 20;

  ground = new Sprite(200, 270, 400, 12, 'static');
  ground.color = '#444';

  player = new Sprite(60, 100, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  // GOOD — kb.presses for a one-shot action.
  if (kb.presses('space')) player.vel.y = -10;

  fill('white');
  textSize(14);
  text('tap SPACE — one jump per press', 14, 24);
}
```

Hold the space bar — still one jump. Tap repeatedly — one jump each tap. Notice the player can also jump *mid-air* — that's a separate bug we'll fix in `2.3.18 Worked Example — Ground Detection`.

## Step 4 — Mix the two intentionally

Continuous motion still uses `kb.pressing` — you *want* `vel.x` to be set every frame the key is held. One-shot actions use `kb.presses`. The two coexist in the same `draw()` because they answer different questions:

- "Should the player be moving right *now*?" → `pressing`
- "Did the player just initiate a jump?" → `presses`

```js live
let player, ground;

function setup() {
  new Canvas(400, 280);
  world.gravity.y = 20;
  ground = new Sprite(200, 270, 400, 12, 'static');
  player = new Sprite(60, 100, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  // Continuous: every-frame question.
  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  // One-shot: edge question.
  if (kb.presses('space')) player.vel.y = -10;
}
```

## Key takeaways

- `kb.pressing(k)` = "is the key held this frame?" Use for continuous motion, hold-to-aim, charge meters.
- `kb.presses(k)` = "did the key just go down?" Use for jump, shoot, toggle, dash.
- The super-jump bug is one wrong word — `pressing` instead of `presses` — and exactly one fix.
- Both can live in the same `draw()` — they answer different questions.
- The mid-air-jump bug (player can jump while falling) is a separate fix; see `2.3.18 Worked Example — Ground Detection`.
