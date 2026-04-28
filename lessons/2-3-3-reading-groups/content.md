## Creating + iterating a Group
**Read before attempting `2.3.5 Groups Sandbox`.**

What you'll learn from it:
- What `new Group()` returns — a Sprite-aware Array, not a plain `[]`.
- How `for…of` and the spread `[...group]` work on it (same as on a real array).
- Why iterating a *copy* (`[...group]`) is the safe pattern when you intend to remove during the loop.
- How `group.length` and `group.push(sprite)` behave just like array methods.

**Try it:** edit the loop body — change the velocity formula, increase the spawn count, log `group.length` to see the array grow.

```js live
let enemies;

function setup() {
  new Canvas(360, 360);
  enemies = new Group();
  enemies.color = 'red';

  for (let i = 0; i < 5; i++) {
    enemies.push(new Sprite(60 + i * 60, 180, 24, 24));
  }
}

function draw() {
  background('#222');
  for (let e of enemies) {
    e.vel.x = sin(frameCount * 0.05 + e.pos.y) * 1.5;
  }
}
```

## Group defaults + the factory pattern
**Read before attempting `2.3.5 Groups Sandbox`.**

What you'll learn from it:
- Setting `group.color`, `group.diameter`, `group.collider` once applies to **every** sprite spawned afterward — no per-sprite repetition.
- The factory form `new groupName.Sprite(x, y)` (capital-S) inherits the group's defaults; bare `new Sprite(x, y)` does NOT.
- Defaults can be overridden per sprite after spawn (`star.color = 'gold'`).
- Combining defaults + factory + a `frameCount % N === 0` spawn timer is the q5play idiom for waves of enemies, projectiles, or particles.

**Try it:** change the defaults (color, diameter) and watch every star update without touching the spawn loop.

```js live
let stars;

function setup() {
  new Canvas(360, 360);
  stars = new Group();
  stars.color = 'yellow';
  stars.diameter = 10;
  stars.collider = 'none';
}

function draw() {
  background('#001133');

  if (frameCount % 8 === 0) {
    let s = new stars.Sprite(Math.random() * 360, 0);
    s.vel.y = 2 + Math.random() * 2;
  }

  for (let s of [...stars]) {
    if (s.y > 380) stars.remove(s);
  }
}
```

---

## Short glossary (quick reference)

| Term | Definition |
|------|-----------|
| **Group** | A q5play collection that behaves like an array of sprites with shared defaults (`.color`, `.diameter`, `.collider`). |
| **Spawn** | Create a new sprite during gameplay — usually via `new groupName.Sprite(...)` so the new sprite inherits group defaults. |
| **Despawn** | Remove a sprite during gameplay via `sprite.remove()` or `group.remove(sprite)`. |
| **Factory pattern** | The `new groupName.Sprite(...)` form (capital-S) — a constructor exposed on the Group itself that creates a member with all the group's defaults applied. |
| **`frameCount % N === 0`** | The q5play timed-spawn idiom. Fires once every N frames; smaller N = faster spawn rate. |
