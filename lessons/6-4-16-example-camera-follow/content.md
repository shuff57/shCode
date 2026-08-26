**Goal:** build a side-scrolling level wider than the canvas and have the camera follow the player.

## Step 1: Hit Run

A 2000-pixel level with a ground bar, four scattered platforms, and a player you can walk left and right. The canvas is only 400px wide: the rest of the world only becomes visible because of `camera.x = player.x`.

```js live
let player;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  // Ground stretches across the whole level.
  let ground = new Sprite(1000, 280, 2000, 20, 'static');
  ground.color = '#554433';

  // Four platforms scattered along the level.
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

  // The follow line.
  camera.x = player.x;
}
```

Hold `D` and walk right. The world appears to scroll past the canvas, but no sprite ever moves except the player: what changes is which range of `x` values the canvas is showing.

## Step 2: Comment out the camera line

Same world, no camera tracking. The player walks right past the canvas edge and disappears. The platforms are still there at `x = 250..1300`; the canvas just isn't pointing at them.

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

  // camera.x = player.x;   // ← removed
}
```

The player exists at `x = 80, 100, 200, 500, 1300, …` regardless of where the canvas points. The "scroll" in Step 1 was the camera moving past stationary sprites.

## Step 3: Add a horizontal offset

`camera.x = player.x` keeps the player dead-center. To bias the camera toward "show more of the level ahead," subtract or add a constant: `camera.x = player.x + 100` pushes the viewport 100px further right, so the player sits 100px *left* of center and you can see 100px more of what is coming.

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

  // Bias the view ahead of the player.
  camera.x = player.x + 100;
}
```

This is the platformer convention: the player sits a third or so of the way from the leading edge so they can see what's coming.

## Key takeaways

- `camera.x = player.x` is the canonical follow line: one assignment, every frame.
- The world doesn't move; the camera does. Sprite positions stay constant.
- Adding a constant (`+ 100`) biases the view ahead of the player: useful for platformers.
- Without the camera line, the player can walk off the canvas: the world is still there, just outside the viewport.
- The next worked example (`2.4.9`) softens this by interpolating with `lerp`.
