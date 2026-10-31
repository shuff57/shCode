**Read before `5.2.17 Lab: Reaching the Goal`.**

**Goal:** See every concept from this module combined into one scene: gravity, a ground-gated jump, bounciness and friction, a wind zone, walls, and a single-fire win condition.

## Step 1: Run the finished scene

```js live console
let player, ground, goal, leftWall, rightWall;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';
  player.bounciness = 0.2;

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.friction = 0.5;

  goal = new Sprite(360, 340, 24, 24);
  goal.collider = 'none';
  goal.color = 'gold';

  leftWall = new Sprite(6, 200, 12, 400, 'static');
  leftWall.color = 'sienna';
  rightWall = new Sprite(394, 200, 12, 400, 'static');
  rightWall.color = 'sienna';
}

function draw() {
  background('#222');
  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -7;
  }

  if (player.y < 200) {
    player.applyForce(0, -3);
  }

  if (goal) {
    const dx = player.x - goal.x;
    const dy = player.y - goal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) {
      console.log('You win!');
      goal.delete();
      goal = null;
    }
  }
}
```

Move with `a` and `d` (the same keys as every lab in this module), jump with the space bar while standing on the ground, drift upward through the wind zone above `y = 200`, bounce a little on landing, and touch the gold goal to win once. The console under the canvas prints `You win!` the moment you touch it.

## Step 2: How close is "touching the goal"?

The goal has `collider = 'none'`, so nothing bumps into it. The scene asks a question instead: how far apart are the centres of the player and the goal?

```js
const dx = player.x - goal.x;              // how far apart, left to right
const dy = player.y - goal.y;              // how far apart, up and down
const dist = Math.sqrt(dx * dx + dy * dy); // the straight-line distance
```

This is the distance formula you met in 3.1.7 Worked Example: Refactoring calcDistance. There it was written `((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5`; `Math.sqrt(...)` and `** 0.5` are the same square root. `if (dist < 25)` then reads "close enough": the two centres are less than 25 pixels apart. A bigger number makes the goal easier to reach, a smaller one makes it harder.

## Step 3: Trace the two guarded patterns

Two lines in `draw()` are doing more work than they look like:

```js
if (kb.presses(' ') && player.colliding(ground)) { player.vel.y = -7; }
if (goal) { /* ... */ }
```

The jump line combines an edge-triggered key check with a ground check: without `player.colliding(ground)`, pressing space again and again mid-air would relaunch the player each time, so it could climb as high as it liked. The goal check wraps the whole win branch in `if (goal)`: once `goal.delete()` runs and `goal` is set to `null`, that condition is false forever after, so the win message can only ever print once. Both are the same shape: a condition that guards a side effect so it happens exactly once, not every frame it stays true.

## Key takeaways

- `world.gravity.y` affects every `dynamic` sprite; `static` sprites like `ground` and the walls never move.
- A jump needs a press check AND a ground check together, joined with `&&`.
- `.bounciness` and `.friction` are set once, on the sprites that need them, and the physics engine handles the rest every frame after.
- `applyForce` adds to existing motion instead of overriding it, which is why the wind zone slows the fall instead of stopping it outright.
- `goal.delete()` is permanent; guarding the branch with `if (goal)` is what keeps a one-time event from firing more than once.
