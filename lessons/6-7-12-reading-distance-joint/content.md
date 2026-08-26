## DistanceJoint

A `DistanceJoint` links two sprites so they stay a fixed distance apart. Think of it as a rigid rod or a taut rope: the sprites can move and rotate, but the gap between them stays constant.

```js
new DistanceJoint(spriteA, spriteB);
```

By default, the joint sets its length from where the two sprites are when `setup()` runs. If you want a specific length, set it on the joint after you create it:

```js
let rope = new DistanceJoint(spriteA, spriteB);
rope.length = 120;
```

**The anchor pattern.** A common use is a fixed anchor plus a free-moving body: one sprite with `collider = 'static'` so it never moves, and a second sprite that swings from it. With gravity turned on, that gives you a pendulum.

**Try it:** run the sketch. The static anchor holds in place; the ball swings below it. Change the `length` value and run again to see the rope get longer or shorter.

```js live
let anchor;
let ball;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;

  anchor = new Sprite(200, 60, 20, 20);
  anchor.collider = 'static';
  anchor.color = '#6272a4';

  ball = new Sprite(300, 60, 24, 24);
  ball.color = '#ff79c6';

  new DistanceJoint(anchor, ball);
}

function draw() {
  background('#282a36');
}
```

The ball starts to the right of the anchor, so that initial distance becomes the rope length. Move `ball`'s starting position farther away and rerun: the pendulum arm gets longer.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Joint** | A Box2D constraint that links two sprites and restricts how they can move relative to each other. |
| **DistanceJoint** | A joint that keeps two sprites at a fixed distance, like a rigid rod or a taut rope. |
| **Anchor** | A sprite with `collider = 'static'` that holds its position and acts as the fixed end of a joint. |
| **Static collider** | A collider type that never moves regardless of forces. Use it for walls, ceilings, and fixed anchor points. |
| **`joint.length`** | The target distance (in pixels) of a `DistanceJoint`. Set it after construction to override the default (the sprites' starting distance). |
