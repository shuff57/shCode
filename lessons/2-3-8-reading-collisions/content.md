## `sprite.overlaps(other)` — boolean form
**Read before attempting `2.3.10 Safe Despawn`.**

What you'll learn from it:
- `overlaps` returns a **boolean** per frame: `true` if the bounding boxes intersect this frame, `false` otherwise.
- Passing a Group as `other` checks the sprite against **every member** — `player.overlaps(enemies)` is `true` if any enemy is currently overlapping.
- The boolean form is right when you only need a yes/no signal — game-over triggers, hit flashes, "did anything collide" gates.
- It does NOT tell you *which* sprite was hit; for that, use the callback form below.

**Try it:** click the canvas to focus, hold WASD to slide the player around, watch the boolean live below.

```js live
let player, enemies;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 30, 30, 'kinematic');
  player.color = 'deepskyblue';

  enemies = new Group();
  enemies.color = 'red';
  for (let i = 0; i < 3; i++) {
    new enemies.Sprite(80 + i * 100, 280, 30, 30);
  }
}

function draw() {
  background('#222');

  if (kb.pressing('a')) player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else player.vel.x = 0;

  if (kb.pressing('w')) player.vel.y = -3;
  else if (kb.pressing('s')) player.vel.y = 3;
  else player.vel.y = 0;

  fill('white');
  textSize(16);
  text('overlaps(enemies): ' + player.overlaps(enemies), 12, 24);
}
```

## `overlaps(other, callback)` — callback form
**Read before attempting `2.3.10 Safe Despawn`.**

What you'll learn from it:
- The callback fires **once per overlapping pair**, with both sprites passed as arguments.
- This is the clean place to call `target.remove()` — q5play has finished iterating internally, so you can't trip the iterate-then-remove bug.
- Ideal for despawn-on-collect (apple catching), despawn-on-hit (bullets), score updates, particle spawns.
- The callback signature is `(self, other) => { ... }` — `self` is always the sprite the method was called on; `other` is the member of the group that's overlapping this frame.

**Try it:** the apple-catcher pattern — basket catches apples, score increments, apple removes itself. Edit `frameCount % 30` to change difficulty.

```js live
let basket, apples, score = 0;

function setup() {
  new Canvas(360, 360);
  basket = new Sprite(180, 320, 60, 14, 'kinematic');
  basket.color = 'saddlebrown';

  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';
}

function draw() {
  background('#113311');

  if (kb.pressing('a')) basket.vel.x = -4;
  else if (kb.pressing('d')) basket.vel.x = 4;
  else basket.vel.x = 0;

  if (frameCount % 30 === 0) {
    let a = new apples.Sprite(20 + Math.random() * 320, -20);
    a.vel.y = 3;
  }

  basket.overlaps(apples, (b, apple) => {
    score++;
    apple.remove();
  });

  for (let a of [...apples]) {
    if (a.y > 380) apples.remove(a);
  }

  fill('white');
  textSize(20);
  text('Score: ' + score, 12, 28);
}
```

---

## Short glossary (quick reference)

| Term | Definition |
|------|-----------|
| **Overlap** | When two sprites' bounding boxes intersect on the current frame. |
| **Boolean form** | `sprite.overlaps(other)` — returns `true`/`false` per frame; right for yes/no signals. |
| **Callback form** | `sprite.overlaps(group, (self, other) => { … })` — fires once per overlapping pair; right for per-pair work like despawning. |
| **Iterate backwards** | Loop from `length - 1` down to `0` so removing items doesn't shift unprocessed indices. |
| **Iterate-a-copy** | `for (let s of [...group])` — same effect as iterating backwards; reads more cleanly. |
| **Callback** | A function passed as an argument to another function (e.g. the second argument to `overlaps`). |
