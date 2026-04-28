# Groups

Read this before `2.3.4 Worked Example — Iterating a Group`. About 5 minutes.

By the end of this reading you should be able to answer:

- What does `new Group()` give you that a plain `[]` doesn't?
- How do you spawn a sprite that automatically inherits a group's defaults?
- Why iterate `[...group]` instead of `group` when you might remove during the loop?

A **Group** is q5play's collection for managing many sprites at once — enemies, projectiles, particles, stars. It looks like an array but knows about sprites.

---

## `new Group()` returns a Sprite-aware Array

A Group behaves like an array — `length`, `push`, `for…of`, spread `[...group]` all work the same way they would on a normal array. The difference is that a Group also has *sprite-specific* features:

- Default properties (`group.color`, `group.diameter`) that apply to members.
- A built-in factory `new groupName.Sprite(...)` that creates members with those defaults.
- Methods like `group.remove(sprite)` that play nicely with the physics world.

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

**What you'll see:** five red squares oscillating left and right in unison. The `for (let e of enemies)` loop runs once per sprite each frame and updates that sprite's velocity.

**Try this:** change the `5` in the spawn loop to `12`. The row gets wider but every other line stays the same — the loop body doesn't care how many sprites there are. That's the win.

---

## Group defaults — set once, applies to every spawn

Setting a property on the group itself (`enemies.color = 'red'`) becomes the **default** for any sprite created via `new groupName.Sprite(...)`. You can still override per sprite afterwards.

```js
stars.color = 'yellow';
stars.diameter = 10;
stars.collider = 'none';

new stars.Sprite(100, 100);   // yellow, diameter 10, no collider
new stars.Sprite(200, 100);   // same
```

Note the lowercase `s` vs capital `S`:

- `new Sprite(...)` — bare. Does NOT use group defaults.
- `new stars.Sprite(...)` — factory form. Inherits defaults from `stars`.

The factory form is the q5play idiom for "spawn a member of this group."

---

## The timed-spawn idiom

A common q5play pattern is "spawn one member every N frames, despawn members that fall off-screen." `frameCount % N === 0` is the timer, the factory creates the sprite, a copy-iteration despawns the off-screen ones:

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

**What you'll see:** a starfield. Every 8 frames a new yellow dot appears at the top with a random horizontal position and falls toward the bottom. Once it's past `y > 380` it's removed.

**Try this:** change `frameCount % 8` to `frameCount % 2` for a blizzard. Then change `stars.color = 'yellow'` to `'white'` and re-run — both existing and future stars are white because the default is read on each spawn.

---

## Why iterate `[...group]`, not `group`

In the spawn example above, the despawn line is:

```js
for (let s of [...stars]) {
  if (s.y > 380) stars.remove(s);
}
```

The brackets `[...stars]` make a **copy** of the group as a plain array, then iterate the copy. Why?

If you iterate the live `stars` group directly and remove an element mid-loop, the remaining members shift down by one index. The loop's pointer keeps moving forward, so it skips the next sprite. By iterating a snapshot, removals don't affect what the loop sees next.

You'll see this same pattern in the next reading (`overlaps` + despawn).

---

## Quick reference

| Term | Meaning |
|------|---------|
| **Group** | A q5play collection that behaves like an array of sprites with shared defaults. |
| **Factory pattern** | `new groupName.Sprite(...)` (capital S) — creates a sprite with the group's defaults applied. |
| **Spawn** | Create a new sprite at runtime. Usually via the factory form. |
| **Despawn** | Remove a sprite at runtime via `sprite.remove()` or `group.remove(sprite)`. |
| **`[...group]`** | Spread copy. Iterate the copy when you might remove during the loop. |
| **`frameCount % N === 0`** | Timed-spawn idiom. Fires once every N frames. |

---

Once you can explain the difference between bare `new Sprite(...)` and `new groupName.Sprite(...)`, open `2.3.4 Worked Example — Iterating a Group`.
