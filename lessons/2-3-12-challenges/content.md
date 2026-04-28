## Challenge 1 — Lives counter (easy)

Extend the Apple Catcher pattern: track a `lives` variable and decrement it when a "rock" (a second Group) hits the basket. Show "Game Over" when `lives <= 0`.

**Target shape:**

```js
let lives = 3;
let rocks;

function setup() {
  // ...basket + apples Groups as in 2.3.7...
  rocks = new Group();
  rocks.color = 'gray';
  rocks.diameter = 20;
  rocks.collider = 'none';
}

function draw() {
  // ...existing apple-catcher logic...
  basket.overlaps(rocks, (b, rock) => {
    lives--;
    rock.delete();
  });

  if (lives <= 0) {
    fill('red');
    textSize(32);
    text('Game Over', 100, 200);
  } else {
    fill('white');
    textSize(16);
    text('Lives: ' + lives, 12, 48);
  }
}
```

**Hints:**
- Spawn rocks every 60 frames or so — slower than apples.
- The auto-grader accepts any line that assigns to `lives` (e.g. `lives = 3`).
- For a smoother game, give rocks a slightly slower `vel.y` than apples.

---

## Challenge 2 — Varied apples (medium)

Make every spawned apple a different size and worth a different score. Larger apples = more points.

**Target shape:**

```js
function draw() {
  if (frameCount % 30 === 0) {
    let size = 12 + Math.random() * 24;
    let a = new apples.Sprite(20 + Math.random() * 360, -20);
    a.diameter = size;
    a.value = Math.round(size / 4);  // bigger = more points
    a.vel.y = 3;
  }

  basket.overlaps(apples, (b, apple) => {
    score += apple.value;
    apple.delete();
  });
}
```

**Hints:**
- Override `apple.diameter` AFTER spawn to break the Group default per-sprite.
- You can attach any custom property (`apple.value`) to a sprite — it's just a JS object.
- The auto-grader accepts any expression that uses `Math.random()` or `random()` to set a sprite's `.diameter` / `.width` / `.height` / `.color`.

---

## Challenge 3 — `cull()` helper (hard)

Write a reusable function `cull(group)` that deletes any sprite past the canvas edge. Use it in place of the manual backwards loop.

**Target shape:**

```js
function cull(group) {
  for (let s of [...group]) {
    if (s.x < -50 || s.x > width + 50 || s.y < -50 || s.y > height + 50) {
      s.delete();
    }
  }
}

function draw() {
  // ...
  cull(apples);
  cull(rocks);
}
```

**Hints:**
- The auto-grader looks for a function declared with `function cull(...)`. Arrow functions assigned to `cull` won't match — use the function-statement form.
- Compare to the manual backwards loop — `cull()` is reusable across every Group in your sketch.
- Stretch: take a margin parameter — `cull(group, margin)` — so callers can decide how far past the edge counts as "off-screen."

---

## If you finish all three

- Combine: a game with apples (scored), rocks (cost a life), and a `cull()` helper handling off-screen cleanup for both.
- Read the q5play `Groups` docs section on `group.cull()` — the engine ships its own version. How does yours differ?
- Show a classmate your favorite challenge and explain why you picked the iteration pattern you did.
