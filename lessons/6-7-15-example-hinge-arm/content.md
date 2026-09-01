**Goal:** See how a static pivot + a dynamic arm + a `HingeJoint` produces a clock-hand that falls under gravity. This example composes the `HingeJoint` reading from 6.8.4.

## Step 1: Hit Run

The pivot sits at the center of the canvas and never moves. The arm starts to the right of the pivot at the same height. Gravity pulls the arm's far end down, so it rotates around the hinge like a clock hand falling to 6 o'clock.

```js live
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;
  let pivot = new Sprite(200, 200, 10, 10);
  pivot.collider = 'static';
  let arm = new Sprite(260, 200, 120, 20);
  new HingeJoint(pivot, arm);
}
function draw() { background('#222'); }
```

## Step 2: Notice where the hinge is

The joint pivots between the two sprite centers. The pivot sprite is at (200, 200) and the arm sprite's center is at (260, 200). The arm is 120 px wide, so its left edge is at roughly 200: almost touching the pivot center. That is the natural hinge point.

Changing the arm's starting x moves the arm further out, which changes the balance point and the swing speed.

```js live
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;
  let pivot = new Sprite(200, 200, 10, 10);
  pivot.collider = 'static';
  let arm = new Sprite(300, 200, 120, 20);  // arm starts further right
  new HingeJoint(pivot, arm);
}
function draw() { background('#222'); }
```

## Step 3: Change the starting angle

Move the arm above or below the pivot to start at a different angle. The arm's center y controls the initial lean.

```js live
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;
  let pivot = new Sprite(200, 200, 10, 10);
  pivot.collider = 'static';
  let arm = new Sprite(260, 140, 120, 20);  // arm starts above-right
  new HingeJoint(pivot, arm);
}
function draw() { background('#222'); }
```

## Key takeaways

- `pivot.collider = 'static'` is what makes the hinge fixed, without it, both sprites would fall together.
- `HingeJoint(pivot, arm)` takes exactly two sprites. There is no `{ anchor }` option; the pivot happens between the two sprite centers.
- The arm's starting position sets the initial angle and how much the far end overhangs the hinge.
- `world.gravity.y` drives the rotation: the heavier side falls, the lighter side rises.
