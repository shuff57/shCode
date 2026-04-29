## Moving the viewport

**Read before attempting `2.4.8 Worked Example — Camera Follow`.**

The **camera** is q5play's viewport — the slice of the world the canvas shows on any given frame. The world doesn't move when the player walks right; the *camera* does. A platform stays at `x = 1500` forever; what changes is which range of `x` values the canvas is currently painting.

Set `camera.x` and `camera.y` to slide the viewport. The canonical follow pattern:

```js
camera.x = player.x;
```

Run that every frame in `draw()` and the player stays centered on the canvas while the world appears to scroll past.

What you'll learn from it:

- `camera.x` / `camera.y` are the viewport's center, not its top-left corner.
- Assigning to them shifts what the canvas displays without moving any sprite.
- The standard follow line is one assignment per frame: `camera.x = player.x`.
- A "world wider than the canvas" is just a scene where sprites exist at `x` values outside `[0, canvas.w]` — your camera math reveals them.

**Try it:** the world is 1200px wide (a row of platforms). The canvas is only 360px wide. Press `D` and `A` to walk; the camera tracks `player.x` so the level scrolls past the canvas.

```js live
let player;

function setup() {
  new Canvas(360, 240);
  world.gravity.y = 10;

  // A long ground 1200px wide.
  let ground = new Sprite(600, 220, 1200, 20, 'static');
  ground.color = '#554433';

  // A few platforms scattered along the level.
  for (let i = 0; i < 4; i++) {
    let plat = new Sprite(150 + i * 280, 160 - (i % 2) * 50, 100, 14, 'static');
    plat.color = '#776655';
  }

  player = new Sprite(60, 180, 28, 32);
  player.image = '🧍';
}

function draw() {
  background('#224');

  if (kb.pressing('d'))      player.vel.x = 4;
  else if (kb.pressing('a')) player.vel.x = -4;
  else                       player.vel.x = 0;

  // The follow line — one assignment, every frame.
  camera.x = player.x;
}
```

Click the preview, hold `D`, and watch the world slide past. Comment out the `camera.x = player.x` line — the player walks off the right edge and disappears. Same world, different camera.

---

## Smoothing with `lerp` + render order with `layer`

**Read before attempting `2.4.9 Worked Example — Smooth Camera with lerp`.**

The hard `camera.x = player.x` follow is glued: the camera moves *exactly* as far as the player every frame. That feels rigid. Real games soften this by interpolating — the camera moves a *fraction* of the distance toward the target each frame, so it eases in.

`lerp(current, target, t)` returns a value `t` of the way from `current` to `target` (where `t` is `0..1`). Small `t` lags more; larger `t` snaps faster. The smoothing line:

```js
camera.x = lerp(camera.x, player.x, 0.1);
```

Separately: `sprite.layer = N` controls draw order. Higher numbers draw on top of lower ones. Use this for HUD-style sprites (a score badge, a UI overlay) that you want above the world.

What you'll learn from it:

- `lerp(current, target, t)` returns a smoothly-interpolated value; small `t` (0.05–0.1) feels lagged, larger `t` (0.3–0.5) feels snappy.
- Replace the hard `camera.x = player.x` with `camera.x = lerp(camera.x, player.x, 0.1)` for a softened follow.
- `sprite.layer = N` sets the draw order — higher draws on top.
- Layers are useful for HUD sprites that should always sit above the world.

**Try it:** same world as Topic 1, but the camera lags. Watch the player drift toward the edge of the canvas before the camera catches up. A second sprite at high `layer` stays pinned to the upper-left as a fake HUD badge — it's a normal sprite, but its layer puts it on top.

```js live
let player, hud;

function setup() {
  new Canvas(360, 240);
  world.gravity.y = 10;

  let ground = new Sprite(600, 220, 1200, 20, 'static');
  ground.color = '#554433';
  for (let i = 0; i < 4; i++) {
    let plat = new Sprite(150 + i * 280, 160 - (i % 2) * 50, 100, 14, 'static');
    plat.color = '#776655';
  }

  player = new Sprite(60, 180, 28, 32);
  player.image = '🧍';

  hud = new Sprite(40, 28, 32, 32, 'static');
  hud.layer = 100;
  hud.image = '⭐';
}

function draw() {
  background('#224');

  if (kb.pressing('d'))      player.vel.x = 4;
  else if (kb.pressing('a')) player.vel.x = -4;
  else                       player.vel.x = 0;

  // Smooth follow — change the 0.1 to feel the difference.
  camera.x = lerp(camera.x, player.x, 0.1);

  // Pin the HUD to the camera so it doesn't slide with the world.
  hud.x = camera.x - 145;
  hud.y = camera.y - 90;
}
```

Try `0.05` (laggier), then `0.5` (snappier). Find a `t` that "feels right" — that's animation work, not math.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Camera** | The viewport into the world. Moving it scrolls the visible region. |
| **`camera.x` / `camera.y`** | The world coordinates the camera is centered on. |
| **Follow pattern** | `camera.x = player.x` — one assignment per frame keeps the player centered. |
| **`lerp(a, b, t)`** | Linear interpolation — returns a value `t` (0..1) of the way from `a` to `b`. |
| **Parallax** | Different layers moving at different speeds for an illusion of depth. |
| **Layer** | Per-sprite draw order — higher numbers draw on top of lower ones. |
