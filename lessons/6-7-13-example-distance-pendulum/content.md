**Goal:** See how a static anchor + a dynamic ball + a `DistanceJoint` produces a pendulum. This example composes the `DistanceJoint` reading from 6.8.2.

## Step 1: Hit Run

You'll see a dark canvas. Sprite `a` sits at the top center as an anchor: it never moves. Sprite `b` starts to the right of `a` at the same height. Gravity pulls `b` down, but the `DistanceJoint` keeps it exactly 100 px from `a`, so it swings like a pendulum bob on a rope.

```js live
let a, b;
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;
  a = new Sprite(200, 50, 30, 30);
  a.collider = 'static';
  b = new Sprite(300, 50, 20, 20);
  new DistanceJoint(a, b);
}
function draw() { background('#222'); }
```

## Step 2: Notice the rope length

The joint did not get a `length` argument. The default length is the distance between the two sprites at the moment the joint is created. `a` is at x 200 and `b` is at x 300, so the starting distance is 100 px: that becomes the permanent rope length.

To change the rope length, set `j.length` after construction:

```js live
let a, b;
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;
  a = new Sprite(200, 50, 30, 30);
  a.collider = 'static';
  b = new Sprite(200, 50, 20, 20);   // same position as a
  let j = new DistanceJoint(a, b);
  j.length = 150;                    // rope is 150 px
}
function draw() { background('#222'); }
```

`b` starts at the same spot as `a`, so the initial distance would be 0. Setting `j.length = 150` after construction gives the joint a real rope length and `b` drops from there.

## Step 3: Try changing gravity

`world.gravity.y` controls how fast `b` falls. A higher value makes it swing harder and faster; zero stops the swing entirely. Edit the value and hit Run to feel the difference.

```js live
let a, b;
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 15;              // stronger pull
  a = new Sprite(200, 50, 30, 30);
  a.collider = 'static';
  b = new Sprite(300, 50, 20, 20);
  new DistanceJoint(a, b);
}
function draw() { background('#222'); }
```

## Key takeaways

- `a.collider = 'static'` pins the anchor in place so the joint has a fixed point to pull against.
- The default joint length equals the distance between the two sprites when the joint is created.
- To use a custom length, store the joint in a variable and set `j.length` right after.
- `world.gravity.y` is the only force acting on `b`: it is what turns the tether into a swing.
