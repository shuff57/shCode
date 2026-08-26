**Goal:** preview how a `HingeJoint` constrains two sprites to rotate around a fixed point. You'll see joints again in W17: today, just read and feel the swing.

## Step 1: Hit Run

A grey static anchor at the top, a tomato-red rod hanging beneath it. The rod swings because gravity pulls it down and the hinge constrains its motion to rotation around the anchor.

```js live
let anchor, rod, joint;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  anchor = new Sprite(200, 60, 20, 20, 'static');
  anchor.color = '#888';

  rod = new Sprite(200, 140, 20, 120);
  rod.color = 'tomato';

  joint = new HingeJoint(anchor, rod);
}

function draw() {
  background('#111');
  if (mouse.presses()) {
    rod.angularVelocity = 6;
  }
}
```

Click the canvas: `mouse.presses()` fires once and gives the rod a kick (`angularVelocity = 6`). Friction inside the joint and air drag bleed energy; the swing decays over time.

## Step 2: Make the rod longer

Change the rod's height from `120` to `220`. The rod swings more slowly. Why? Its moment of inertia grew: there's more mass farther from the pivot, so the same gravity has a harder time turning it.

```js live
let anchor, rod, joint;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  anchor = new Sprite(200, 60, 20, 20, 'static');
  anchor.color = '#888';

  rod = new Sprite(200, 190, 20, 220);
  rod.color = 'tomato';

  joint = new HingeJoint(anchor, rod);
}

function draw() {
  background('#111');
  if (mouse.presses()) {
    rod.angularVelocity = 6;
  }
}
```

## Step 3: Chain two pendulums

Add a second rod hinged to the first rod's bottom end: that's a double pendulum. The motion is famously chaotic; small differences in the initial kick produce wildly different swings.

```js live
let anchor, rod, rod2, joint, joint2;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  anchor = new Sprite(200, 60, 20, 20, 'static');
  anchor.color = '#888';

  rod = new Sprite(200, 140, 20, 120);
  rod.color = 'tomato';

  rod2 = new Sprite(200, 240, 20, 100);
  rod2.color = 'orange';

  joint = new HingeJoint(anchor, rod);
  joint2 = new HingeJoint(rod, rod2);
}

function draw() {
  background('#111');
  if (mouse.presses()) {
    rod.angularVelocity = 8;
  }
}
```

Click a few times. Watch how the second rod's path shifts unpredictably with each new kick.

## Key takeaways

- A `HingeJoint(a, b)` constrains `b` to rotate around `a`. Position the joint by positioning `a`; `b` swings off it.
- A static body (the anchor) doesn't move under forces, so it acts as a fixed pivot.
- `mouse.presses()` is edge-triggered: same idea as `kb.presses()`. One click = one kick.
- Joint chains compound: you can attach a `HingeJoint` to another rod that's itself hinged. That's how skeletons work.
- This whole sketch is a preview of W17: don't grind on the math today; just notice that joints turn separate sprites into one connected system.
