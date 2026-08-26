## HingeJoint

A `HingeJoint` pins two sprites to a single pivot point. They can rotate freely around that point, but neither sprite can pull away from it. Think of a door hinge, a clock hand, or a rotating arm.

```js
new HingeJoint(spriteA, spriteB);
```

The hinge pivots between the two sprites: typically you put a small static sprite where you want the pivot and attach a longer dynamic sprite to it. The dynamic sprite rotates around the static one.

**Compare to DistanceJoint.** `DistanceJoint` keeps sprites at a fixed *distance*. `HingeJoint` keeps sprites rotating around a fixed *point*. They are different constraints: use the one that matches the motion you want.

**Try it:** run the sketch. The pivot holds still; the arm swings down under gravity and settles. Change `world.gravity.y` to `0` and rerun: the arm stays wherever it starts.

```js live
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;

  let pivot = new Sprite(200, 180, 14, 14);
  pivot.collider = 'static';
  pivot.color = '#6272a4';

  let arm = new Sprite(260, 180, 120, 18);
  arm.color = '#ffb86c';

  new HingeJoint(pivot, arm);
}

function draw() {
  background('#282a36');
}
```

The arm starts horizontally to the right of the pivot. Gravity pulls the far end down, and the arm swings like a clock hand. Move the arm's starting `y` above or below the pivot to change the initial angle.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **HingeJoint** | A joint that pins two sprites and lets them rotate freely around the connection point between them. |
| **Pivot** | The point a `HingeJoint` rotates around: set implicitly by where the two sprites sit when the joint is created. |
