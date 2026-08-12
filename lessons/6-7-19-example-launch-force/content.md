**Goal:** Use the vector-from-A-to-B pattern (2.7.18) and `applyForce` (2.7.17) to launch a ball toward a static target when the player presses Space.

## Step 1 — Hit Run and press Space

A ball sits near the bottom-left. A static target sits near the top-right. Press Space and the ball launches toward the target in a gravity-affected arc.

```js live
let ball, target;
function setup() {
  new Canvas(500, 400);
  world.gravity.y = 8;
  ball = new Sprite(100, 350, 20, 20);
  target = new Sprite(400, 100, 30, 30);
  target.collider = 'static';
}
function draw() {
  background('#222');
  if (kb.presses(' ')) {
    let dx = target.pos.x - ball.pos.x;
    let dy = target.pos.y - ball.pos.y;
    ball.applyForce(dx * 0.5, dy * 0.5);
  }
}
```

## Step 2 — Trace the vector math

`dx = target.pos.x - ball.pos.x` and `dy = target.pos.y - ball.pos.y` give the direction from the ball to the target — the same subtraction pattern from 2.7.18. Multiplying by `0.5` scales the push: larger makes a flatter arc, smaller makes gravity bend the path sooner. Press Space several times in a row — forces accumulate and the ball picks up speed.

```js live
let ball, target;
function setup() {
  new Canvas(500, 400);
  world.gravity.y = 8;
  ball = new Sprite(100, 350, 20, 20);
  target = new Sprite(400, 100, 30, 30);
  target.collider = 'static';
}
function draw() {
  background('#222');
  if (kb.presses(' ')) {
    let dx = target.pos.x - ball.pos.x;  // direction to target
    let dy = target.pos.y - ball.pos.y;
    ball.applyForce(dx * 0.5, dy * 0.5); // scale controls arc flatness
  }
}
```

## Step 3 — Try a different scale

Change `0.5` to `0.2` and press Space. The ball falls short — too little force to overcome gravity's pull. Then try `1.0` — the ball overshoots and gravity barely bends its path. The scale factor is the only knob between a weak lob and a line drive.

```js live
let ball, target;
function setup() {
  new Canvas(500, 400);
  world.gravity.y = 8;
  ball = new Sprite(100, 350, 20, 20);
  target = new Sprite(400, 100, 30, 30);
  target.collider = 'static';
}
function draw() {
  background('#222');
  if (kb.presses(' ')) {
    let dx = target.pos.x - ball.pos.x;
    let dy = target.pos.y - ball.pos.y;
    ball.applyForce(dx * 0.2, dy * 0.2); // try 0.2, then 1.0
  }
}
```

## Key takeaways

- `applyForce(fx, fy)` takes two numbers — x and y components of the push.
- Subtracting ball coordinates from target coordinates gives the direction vector (2.7.18).
- The scale factor determines force magnitude — it is the only thing to tune for arc shape.
- Forces accumulate across frames; each Space press adds to the ball's velocity.
