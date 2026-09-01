**Goal:** See `bounciness` values of 0.2, 0.6, and 1.0 side by side so the difference between a dead thud and a nearly lossless rebound is immediately visible. Composes the `bounciness` reading from 6.7.14.

## Step 1: Hit Run and watch the three balls

Three sprites drop onto the same floor at the same moment. Left ball barely rebounds. Middle ball bounces moderately. Right ball rebounds to nearly the same height each time.

```js live
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 8;
  let floor = new Sprite(200, 380, 400, 20);
  floor.collider = 'static';
  let dull = new Sprite(100, 50, 30, 30);  dull.bounciness  = 0.2;
  let mid  = new Sprite(200, 50, 30, 30);  mid.bounciness   = 0.6;
  let live = new Sprite(300, 50, 30, 30);  live.bounciness  = 1.0;
}
function draw() { background('#222'); }
```

## Step 2: What each value means

`bounciness` controls the fraction of impact velocity the sprite keeps after each collision. At `0.2`, most kinetic energy is absorbed: dead thud. At `0.6`, about 60% of the velocity is preserved: a visible bounce that decays over several contacts. At `1.0`, nearly all velocity is kept: the ball rebounds to almost the same height each time. It still loses a tiny amount per contact due to physics-engine rounding, so it never bounces forever, but the decay is very slow.

```js live
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 8;
  let floor = new Sprite(200, 380, 400, 20);
  floor.collider = 'static';
  // Change any value below and hit Run to compare
  let dull = new Sprite(100, 50, 30, 30);  dull.bounciness  = 0.2;
  let mid  = new Sprite(200, 50, 30, 30);  mid.bounciness   = 0.6;
  let live = new Sprite(300, 50, 30, 30);  live.bounciness  = 1.0;
}
function draw() { background('#222'); }
```

## Key takeaways

- `bounciness` is set on the sprite, not the floor: `sprite.bounciness = 0.6`.
- `0` = dead thud (all energy absorbed), `1.0` = nearly lossless (almost all energy kept).
- Values between 0 and 1.0 are the useful range; keep `bounciness` at or below `1.0`.
- All three sprites use the same gravity and the same floor: `bounciness` is the only variable.
