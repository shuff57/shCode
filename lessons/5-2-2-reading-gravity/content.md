## Gravity

**Read before `5.2.8 Lab: Tune Gravity`.**

**What you'll learn from it:**

- `world.gravity.y` is a per-world setting, not a per-sprite one: one number affects every dynamic sprite in the scene.
- Positive values pull down, `0` turns gravity off, negative values pull up.
- A `dynamic` sprite (the default) is affected by gravity and forces. A `static` sprite is immovable: that's why `ground` is `static` and `player` isn't.

**Try it:**

```js live console
let ball, ground;

function setup() {
  new Canvas(360, 300);
  world.gravity.y = 10;

  ball = new Sprite(180, 60, 30, 30);
  ball.color = 'deepskyblue';

  ground = new Sprite(180, 280, 360, 20, 'static');
  ground.color = 'gray';
}

function draw() {
  background('#222');
  if (frameCount % 60 === 0) {
    console.log('ball.y =', Math.round(ball.y));
  }
}
```

Run it and read the console under the canvas: once a second it prints `ball.y`. The number grows while the ball falls (a bigger `y` is further down), then stops changing once the ball lands on the ground. Then change `world.gravity.y = 10` to `world.gravity.y = 0` and rerun: the ball just floats. Try `-5` next: it drifts upward instead.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| Gravity | A force pulling dynamic sprites in a direction; `world.gravity.y` controls it |
| dynamic | The default sprite body type: affected by gravity and forces |
| static | An immovable sprite body type; used for ground and walls |
