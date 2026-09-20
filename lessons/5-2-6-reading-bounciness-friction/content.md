## Bounciness and Friction

**Read before `5.2.7 Bouncy Ball`.**

**What you'll learn from it:**

- `.bounciness` (restitution) is how much speed a sprite keeps after a collision, from `0` (sticks) to `1` (bounces at full speed).
- `.friction` resists sliding along a surface: `0` is ice, higher values drag motion to a stop.
- When two colliding sprites disagree, bounciness uses the higher of the two values; friction uses a geometric mean of the two.

**Try it:**

```js live
let ball, floor;

function setup() {
  new Canvas(360, 300);
  world.gravity.y = 10;

  ball = new Sprite(180, 40, 30, 30);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.8;

  floor = new Sprite(180, 280, 360, 20, 'static');
  floor.color = 'gray';
}

function draw() {
  background('#222');
}
```

Run it and watch the ball rebound most of the way back up on each bounce. Now change `ball.bounciness = 0.8` to `ball.bounciness = 0` and rerun: it lands and stays put.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| Bounciness | Restitution: how much speed a sprite keeps after a collision, `0`–`1` |
| Friction | Resistance to sliding along a surface; `0` is ice |
