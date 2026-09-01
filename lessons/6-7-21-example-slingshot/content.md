**Goal:** Compose hit-testing (6.7.6), drag (6.7.9), `DistanceJoint` (6.8.2), `joint.delete()` (6.8.6), `applyForce` (6.7.12), and vector math (6.7.13) into a working slingshot: the unit's integration moment.

## Step 1: Hit Run and try the slingshot

Click the ball near the center-left, drag it away from the anchor, and release. The ball snaps back toward the anchor and launches past it under gravity.

```js live
let ball, anchor, joint, dragging = false;
function setup() {
  new Canvas(500, 400);
  world.gravity.y = 10;
  anchor = new Sprite(100, 300, 10, 10);
  anchor.collider = 'static';
  ball = new Sprite(100, 300, 20, 20);
  joint = new DistanceJoint(anchor, ball);
  joint.length = 0;
}
function draw() {
  background('#222');
  if (mouse.pressing() && world.getSpriteAt(mouse.x, mouse.y) === ball) dragging = true;
  if (dragging) {
    ball.pos.x = mouse.x; ball.pos.y = mouse.y;
    ball.vel.x = 0; ball.vel.y = 0;
  }
  if (!mouse.pressing() && dragging) {
    dragging = false;
    let dx = anchor.pos.x - ball.pos.x;
    let dy = anchor.pos.y - ball.pos.y;
    joint.delete();
    ball.applyForce(dx * 5, dy * 5);
  }
}
```

## Step 2: Setup: anchor + ball + zero-length joint

`anchor` is static: it never moves. `ball` starts at the same position. `new DistanceJoint(anchor, ball)` creates the tether; `joint.length = 0` sets the natural resting length to zero (so the ball sits right on the anchor when nothing pulls it). Without `joint.length = 0` the natural length would be the starting distance: also zero here, but setting it explicitly makes the intent clear.

```js live
let ball, anchor, joint, dragging = false;
function setup() {
  new Canvas(500, 400);
  world.gravity.y = 10;
  anchor = new Sprite(100, 300, 10, 10);
  anchor.collider = 'static';
  ball = new Sprite(100, 300, 20, 20);
  joint = new DistanceJoint(anchor, ball);
  joint.length = 0;  // resting length = 0 → ball sits on anchor
}
function draw() { background('#222'); }
```

## Step 3: Drag: snap position, zero velocity

While dragging, the ball's position is forced to the cursor every frame and its velocity is zeroed. Without the velocity zero, the physics engine's own velocity would fight the position override and the ball would shake. The `world.getSpriteAt` hit-test ensures dragging only starts when the cursor is actually on the ball: clicking the anchor or empty canvas does nothing.

> **Why `mouse.pressing()` here, not `mouse.presses()`?** 6.7.10 used `mouse.presses()` (one-shot, fires only on the first frame the button goes down) to start its drag. This slingshot uses `mouse.pressing()` (held, fires every frame the button is down) so the drag re-engages on any frame the cursor is over the ball while the button is held: more forgiving when the ball is small and the cursor slips off the first try. Either form works; the difference is how strict the start is.

```js live
let ball, anchor, joint, dragging = false;
function setup() {
  new Canvas(500, 400);
  world.gravity.y = 10;
  anchor = new Sprite(100, 300, 10, 10);
  anchor.collider = 'static';
  ball = new Sprite(100, 300, 20, 20);
  joint = new DistanceJoint(anchor, ball);
  joint.length = 0;
}
function draw() {
  background('#222');
  // Start drag only when cursor lands on the ball
  if (mouse.pressing() && world.getSpriteAt(mouse.x, mouse.y) === ball) dragging = true;
  // Snap ball to cursor and erase physics velocity each drag frame
  if (dragging) {
    ball.pos.x = mouse.x; ball.pos.y = mouse.y;
    ball.vel.x = 0; ball.vel.y = 0;
  }
}
```

## Step 4: Release: delete joint, apply force

When the mouse button comes up while dragging, `dx = anchor.pos.x - ball.pos.x` and `dy = anchor.pos.y - ball.pos.y` compute the vector from the ball's pulled-back position back to the anchor: the bowstring direction. `joint.delete()` removes the constraint; `ball.applyForce(dx * 5, dy * 5)` fires the ball along that vector. The scale `5` is large enough to overcome gravity for a visible arc.

```js live
let ball, anchor, joint, dragging = false;
function setup() {
  new Canvas(500, 400);
  world.gravity.y = 10;
  anchor = new Sprite(100, 300, 10, 10);
  anchor.collider = 'static';
  ball = new Sprite(100, 300, 20, 20);
  joint = new DistanceJoint(anchor, ball);
  joint.length = 0;
}
function draw() {
  background('#222');
  if (mouse.pressing() && world.getSpriteAt(mouse.x, mouse.y) === ball) dragging = true;
  if (dragging) {
    ball.pos.x = mouse.x; ball.pos.y = mouse.y;
    ball.vel.x = 0; ball.vel.y = 0;
  }
  if (!mouse.pressing() && dragging) {
    dragging = false;
    let dx = anchor.pos.x - ball.pos.x; // vector: ball → anchor (bowstring direction)
    let dy = anchor.pos.y - ball.pos.y;
    joint.delete();                      // free the ball
    ball.applyForce(dx * 5, dy * 5);    // launch
  }
}
```

## Key takeaways

- `joint.length = 0` after construction sets the natural resting length (the third-arg object form is not supported, always use the property).
- `world.getSpriteAt(x, y) === ball` is the only correct cursor hit-test: do not use `overlaps`.
- Zero the ball's velocity every drag frame or the physics engine fights the position override.
- `joint.delete()` releases the constraint: `joint.remove()` does not exist.
- The force vector points from the pulled-back ball back toward the anchor: that is the bowstring snap direction.
