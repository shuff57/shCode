## applyForce(fx, fy)

**Read before attempting `6.7.19 Worked Example — Launch a Sprite with applyForce`.**

`sprite.applyForce(fx, fy)` gives a sprite a one-frame push. The physics engine takes that push and adds it to the sprite's motion — so if you press Space once, the sprite moves, and it keeps moving (subject to gravity and friction) even after you let go.

This is different from setting `sprite.vel.x` directly. Setting velocity *replaces* whatever motion the sprite already has. `applyForce` *adds* to it, which means the physics simulation stays in charge and the result feels natural.

**What you'll learn from it:**
- `applyForce(fx, fy)` adds a one-frame impulse — `fx` is the horizontal push, `fy` is the vertical push.
- Negative `fy` pushes upward (canvas y grows downward, so negative = up).
- The impulse is applied once; motion continues because the physics engine integrates it.
- `applyForce` works with gravity — if gravity is on, the ball arcs realistically after the impulse.

**Try it:** press Space. The ball jumps. Press Space again mid-air and it gets another boost. Notice the ball stays in the air for a bit — gravity pulls it back down, not your code.

```js live
let ball;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 8;

  let floor = new Sprite(200, 290, 400, 20);
  floor.collider = 'static';
  floor.color = '#444';

  ball = new Sprite(200, 240, 30);
  ball.color = '#bd93f9';
}

function draw() {
  background('#282a36');
  if (kb.presses(' ')) {
    ball.applyForce(0, -200);
  }
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`applyForce(fx, fy)`** | Adds a one-frame impulse to a sprite. `fx` = horizontal push, `fy` = vertical push. |
| **Impulse** | A single-frame push that the physics engine integrates into the sprite's ongoing motion. |
| **`fy` direction** | Negative `fy` pushes up; positive `fy` pushes down (canvas y increases downward). |
| **vs. setting `vel`** | `applyForce` adds to velocity; setting `vel` replaces it. Use `applyForce` when physics should stay in control. |
