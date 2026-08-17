**Goal:** create a Group, populate it with sprites, and iterate the Group every frame to drive per-sprite motion.

## Step 1 — Hit Run

Five red enemies in a row, each wobbling left and right. The wobble is computed in `draw()` for every sprite in the Group on every frame.

```js live
let enemies;

function setup() {
  new Canvas(400, 400);
  enemies = new Group();
  enemies.color = 'red';

  for (let i = 0; i < 5; i++) {
    enemies.push(new Sprite(random(50, 350), random(50, 350), 20, 20));
  }
}

function draw() {
  background('#222');
  for (let e of enemies) {
    e.vel.x = sin(frameCount * 0.1 + e.pos.y) * 0.5;
  }
}
```

Notice what's happening: `enemies` is created once in `setup()`. The `for (let e of enemies)` loop in `draw()` runs over every sprite, every frame. The sprite's `pos.y` (set at spawn) seeds the sine wave so each enemy gets a slightly different phase.

## Step 2 — Change the wobble formula

Replace the `vel.x` line with `vel.y` (or both). Notice the loop still works — you're driving whatever property you want on whichever axis.

```js live
let enemies;

function setup() {
  new Canvas(400, 400);
  enemies = new Group();
  enemies.color = 'red';

  for (let i = 0; i < 5; i++) {
    enemies.push(new Sprite(random(50, 350), random(50, 350), 20, 20));
  }
}

function draw() {
  background('#222');
  for (let e of enemies) {
    e.vel.y = sin(frameCount * 0.1 + e.pos.x) * 1.2;
  }
}
```

The pattern is: per-frame loop → look up some unique seed on each sprite (`e.pos.x`, `e.pos.y`, or even an index you stored on `e`) → drive a property.

## Step 3 — Scale up

Spawn 30 enemies instead of 5. The same loop handles all of them — that's the point of a Group.

```js live
let enemies;

function setup() {
  new Canvas(400, 400);
  enemies = new Group();
  enemies.color = 'red';

  for (let i = 0; i < 30; i++) {
    enemies.push(new Sprite(random(50, 350), random(50, 350), 12, 12));
  }
}

function draw() {
  background('#222');
  for (let e of enemies) {
    e.vel.x = sin(frameCount * 0.1 + e.pos.y) * 0.5;
  }
}
```

No `draw()` change. The loop body is the **interface** — the Group is the **collection**. As long as every sprite in the Group shares an interface (here: has `pos.y`, has `vel.x`), one loop drives all of them.

## Key takeaways

- A `Group` is iterated with `for (let s of group)` exactly like an array.
- Per-sprite uniqueness comes from each sprite's own state (position, index, custom property), not from the loop.
- Group size is invisible to the loop — 5 sprites or 500 sprites use the same code.
- Group iteration in `draw()` runs every frame. Keep the per-sprite work cheap.
- For the safe iteration pattern when you also need to *remove* during the loop, see `6.1.10 Worked Example — Safe Despawn`.
