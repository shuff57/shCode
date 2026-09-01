**Goal:** soften the hard camera follow with `lerp` so the camera eases toward the player instead of being glued to them.

## Step 1: Hit Run with the hard follow

The line is `camera.x = player.x`: same as `6.4.16`. The camera moves *exactly* as far as the player every frame, which feels rigid. Walk and run to feel it.

```js live
let player;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  let ground = new Sprite(1000, 280, 2000, 20, 'static');
  ground.color = '#554433';
  for (let i = 0; i < 4; i++) {
    let plat = new Sprite(250 + i * 350, 200 - (i % 2) * 60, 120, 14, 'static');
    plat.color = '#776655';
  }

  player = new Sprite(80, 240, 30, 36);
  player.image = '🧍';
}

function draw() {
  background('#224');

  if (kb.pressing('d'))      player.vel.x = 5;
  else if (kb.pressing('a')) player.vel.x = -5;
  else                       player.vel.x = 0;

  if (kb.presses('w') && player.colliding(allSprites)) {
    player.vel.y = -8;
  }

  camera.x = player.x;
}
```

Glued. Every player pixel of motion = one pixel of camera motion. No "feel."

## Step 2: Replace with `lerp`

`lerp(camera.x, player.x, 0.1)` returns a value 10% of the way from the camera's current `x` toward the player's `x`. Each frame the camera *closes 10%* of the gap, never quite catching up, until the player stops, at which point it asymptotes in.

```js live
let player;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  let ground = new Sprite(1000, 280, 2000, 20, 'static');
  ground.color = '#554433';
  for (let i = 0; i < 4; i++) {
    let plat = new Sprite(250 + i * 350, 200 - (i % 2) * 60, 120, 14, 'static');
    plat.color = '#776655';
  }

  player = new Sprite(80, 240, 30, 36);
  player.image = '🧍';
}

function draw() {
  background('#224');

  if (kb.pressing('d'))      player.vel.x = 5;
  else if (kb.pressing('a')) player.vel.x = -5;
  else                       player.vel.x = 0;

  if (kb.presses('w') && player.colliding(allSprites)) {
    player.vel.y = -8;
  }

  // Smooth follow.
  camera.x = lerp(camera.x, player.x, 0.1);
}
```

Walk right. The player gets ahead of the camera; the camera "catches up" smoothly. That trailing motion is the whole point.

## Step 3: Tune the `t`

The third argument to `lerp` is how *much* of the gap to close per frame. Try `0.05` (laggier: the camera trails further), then `0.5` (snappier: closes most of the gap each frame). There's no right answer; pick what feels right for your game.

```js live
let player;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  let ground = new Sprite(1000, 280, 2000, 20, 'static');
  ground.color = '#554433';
  for (let i = 0; i < 4; i++) {
    let plat = new Sprite(250 + i * 350, 200 - (i % 2) * 60, 120, 14, 'static');
    plat.color = '#776655';
  }

  player = new Sprite(80, 240, 30, 36);
  player.image = '🧍';
}

function draw() {
  background('#224');

  if (kb.pressing('d'))      player.vel.x = 5;
  else if (kb.pressing('a')) player.vel.x = -5;
  else                       player.vel.x = 0;

  if (kb.presses('w') && player.colliding(allSprites)) {
    player.vel.y = -8;
  }

  // Try changing 0.5 to 0.05 or 0.1: different feel each time.
  camera.x = lerp(camera.x, player.x, 0.5);
}
```

Most platformers land somewhere around `0.08–0.15`. Anything below `0.05` feels distractingly laggy; anything above `0.4` is barely different from the hard follow.

## Key takeaways

- `lerp(a, b, t)` returns a value `t` of the way from `a` to `b` (where `t` is 0..1).
- `camera.x = lerp(camera.x, player.x, 0.1)` softens the follow by closing 10% of the gap per frame.
- Smaller `t` lags more; larger `t` snaps faster: there's no math-correct value, only feel.
- The same `lerp` pattern works for `camera.y` if the level is tall.
- Tuning is part of game design: playtest the value, don't compute it.
