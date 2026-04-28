---
theme: default
title: "Module 2.3 — Collections and Physics Applications"
info: |
  Module 2.3: Groups, overlaps, safe despawn, edge-triggered input, ground-gated jumps.
  Weeks 13–14 · Q2 · 4 class sessions.
  Covers: Group, overlaps callback form, iterate-then-delete bug, kb.presses vs kb.pressing, sprite.touching.
class: text-center
transition: slide-left
mdc: true
---

# Module 2.3 — Collections and Physics Applications

**Weeks 13–14 · Quarter 2 · Four sessions**

You can write a class. Now you'll manage *fleets* of them — and make them feel like a game.

<div class="text-sm opacity-70 mt-8">
Press <kbd>Space</kbd> or <kbd>→</kbd> to advance · <kbd>e</kbd> to open slide notes
</div>

---

# What you already know (Unit 2.2)

```js
class Enemy {
  constructor(x, y, hp) {
    this.sprite = new Sprite(x, y, 30, 30);
    this.hp = hp;
  }
  damage(n) { /* ... */ }
}

let enemy = new Enemy(200, 200, 10);
```

- Classes bundle data and behavior into one unit.
- One class definition produces many independent instances.

<v-click>

**Pause. Think.**

You want **20 enemies on screen**. What would you reach for first?

</v-click>

---

# The naive answer

```js
let e1 = new Enemy(50, 50, 5);
let e2 = new Enemy(100, 50, 5);
let e3 = new Enemy(150, 50, 5);
// ...17 more lines...
```

<v-click>

That's twenty named variables. Now: damage `e7`. Despawn `e12`. Add a `boss` flag to all of them.

This doesn't scale.

</v-click>

<v-click>

You already know one fix from CS-1: **arrays**. Push enemies into one. Loop over them.

This week q5play gives you a smarter version of an array — one that knows what a sprite is.

</v-click>

---

# Four big ideas this unit

<div class="grid grid-cols-2 gap-6 mt-4 text-sm">
<div>

## 1. Groups

`new Group()` — an array-like collection with sprite-aware factory + defaults.

## 2. Overlaps + safe despawn

`overlaps(group, callback)` — handle every collision pair, then delete safely.

</div>
<div>

## 3. Edge-triggered input

`kb.presses` vs `kb.pressing` — once-per-tap vs every-frame-held.

## 4. Ground-gated jumps

`sprite.touching(other)` — physics contact, not bounding-box overlap.

</div>
</div>

<v-click>

Each one fixes a class of bugs you can't fix without it. We'll see each one **break** before we see it work.

</v-click>

---
layout: section
---

# 1 · Groups

Twenty enemies, one variable.

---

# `new Group()` — an array of sprites

A `Group` looks like an array (`length`, `push`, spread, `for…of` all work) but has sprite-specific superpowers.

```js
let enemies = new Group();
enemies.push(new Sprite(100, 100, 30, 30));
enemies.push(new Sprite(200, 100, 30, 30));

console.log(enemies.length);  // 2
for (let e of enemies) e.vel.x = 2;
```

<v-click>

But if `Group` were *only* an array, you wouldn't need it. The win is what comes next.

</v-click>

---

# Group defaults — set once, every spawn inherits

```js
let stars = new Group();
stars.color = 'yellow';
stars.diameter = 10;
stars.collider = 'none';
```

<v-click>

Now `stars` carries those defaults. Any sprite created **through the group's factory** picks them up automatically:

```js
new stars.Sprite(100, 100);   // yellow, dia 10, no collider
new stars.Sprite(200, 100);   // same
new stars.Sprite(300, 100).color = 'red';  // override per-spawn
```

</v-click>

<v-click>

Lowercase `s` → bare constructor (ignores defaults). Capital `S` on the group → factory form (uses defaults).

```js
new Sprite(100, 100, 30, 30);   // bare — no defaults
new stars.Sprite(100, 100);     // factory — inherits stars' defaults
```

</v-click>

---

<script setup lang="ts">
const sketchStarfield = `let stars;

function setup() {
  new Canvas(360, 360);
  stars = new Group();
  stars.color = 'yellow';
  stars.diameter = 10;
  stars.collider = 'none';
}

function draw() {
  background('#001133');

  // Spawn one star every 8 frames at a random x.
  if (frameCount % 8 === 0) {
    let s = new stars.Sprite(Math.random() * 360, 0);
    s.vel.y = 2 + Math.random() * 2;
  }

  // Despawn stars that fell past the bottom.
  for (let s of [...stars]) {
    if (s.y > 380) s.delete();
  }
}`;
</script>

# Live: a starfield in 14 lines

<Q5Runner :code="sketchStarfield" :width="320" :height="320" />

`new stars.Sprite(...)` is the spawn. `frameCount % 8 === 0` is the timer. The for-loop is the cleanup.

---

# The timed-spawn idiom

```js
if (frameCount % 30 === 0) {
  let a = new apples.Sprite(Math.random() * 400, -20);
  a.vel.y = 3;
}
```

<v-click>

Three knobs in three numbers:

- **`30`** — frames between spawns. Lower = faster. **This is your difficulty knob.**
- **`-20`** — spawn-y. Off-canvas so they enter cleanly.
- **`vel.y = 3`** — fall speed. Per-sprite, set after spawn.

</v-click>

<v-click>

`frameCount % N === 0` drives nearly every "spawn enemies on a timer" mechanic. Memorize it.

</v-click>

---
layout: center
class: text-center
---

# Q1 break (~1 min)

**Turn to your neighbor:**

If you write `new stars.Sprite(...)` (capital S) — what color is the new sprite?

If you write `new Sprite(...)` (bare) — what color is the new sprite?

**Hint:** what does each form know about `stars.color`?

---
layout: section
---

# 2 · Overlaps

Detect contact. Handle every pair. Then delete safely.

---

# `overlaps` has two faces

```js
// FORM 1: boolean — "did anything hit me this frame?"
if (player.overlaps(enemies)) {
  /* game over flash */
}

// FORM 2: callback — "do something for each pair"
basket.overlaps(apples, (b, apple) => {
  score++;
  apple.delete();
});
```

<v-click>

**Boolean form** — yes/no signal. Use for game-over flags, hit indicators, trigger zones.

**Callback form** — runs **once per overlapping pair**. Use when you need to act on the *specific* sprite that was hit.

</v-click>

---

# The callback's two arguments

```js
basket.overlaps(apples, (self, other) => {
  //               ^^^^   ^^^^^
  //               ‘self’ is always `basket` (the caller).
  //               ‘other’ is the apple sprite that hit it.
});
```

<v-click>

Inside the callback, `other` is the *specific* apple — you can read its properties, change them, or destroy it.

```js
basket.overlaps(apples, (b, apple) => {
  score += apple.value;     // read a custom property
  apple.delete();           // destroy this one
});
```

</v-click>

<v-click>

The boolean form **doesn't tell you which** apple. The callback form **does**. That's the whole reason you'd use it.

</v-click>

---

<script setup lang="ts">
const sketchAppleCatcher = `let basket, apples, score = 0;

function setup() {
  new Canvas(360, 360);
  world.gravity.y = 0;

  basket = new Sprite(180, 330, 60, 14, 'kinematic');
  basket.color = 'saddlebrown';

  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';
}

function draw() {
  background('#113311');

  if (kb.pressing('a'))      basket.vel.x = -4;
  else if (kb.pressing('d')) basket.vel.x = 4;
  else                       basket.vel.x = 0;

  if (frameCount % 30 === 0) {
    let a = new apples.Sprite(20 + Math.random() * 320, -20);
    a.vel.y = 3;
  }

  // CALLBACK form — score and delete the SPECIFIC apple that hit.
  basket.overlaps(apples, (b, apple) => {
    score++;
    apple.delete();
  });

  // Off-screen cleanup — apples that miss the basket.
  for (let a of [...apples]) {
    if (a.y > 380) a.delete();
  }

  fill('white');
  textSize(20);
  text('Score: ' + score, 12, 28);
}`;
</script>

# Live: Apple Catcher

<Q5Runner :code="sketchAppleCatcher" :width="320" :height="320" />

Click the canvas, then **A** / **D** to slide the basket. Every catch fires the callback once.

---

# `delete()` vs `group.remove()`

Two different operations that look almost identical.

<div class="grid grid-cols-2 gap-6 mt-4 text-sm">
<div>

## `sprite.delete()`

**Destroys** the sprite.

- Tears down its physics body
- Removes it from **every** group it's in (including `allSprites`)
- Sprite is gone from the world

Use for: caught apples, defeated enemies, spent projectiles.

</div>
<div>

## `group.remove(sprite)`

**Unparents** from one group.

- The sprite still exists
- Still draws, still runs physics
- Still in any other groups it belongs to

Use for: moving sprites *between* groups (e.g. promoting an enemy from `easy` → `boss`).

</div>
</div>

<v-click>

There is **no `sprite.remove()`**. That name only exists on `Group`. Calling it on a sprite throws `TypeError`.

For cleanup, you almost always want `delete()`.

</v-click>

---
layout: section
---

# 3 · The iterate-then-delete bug

The bug you can't see in static code review. You have to run it.

---

# Setup: 8 apples, all about to be deleted

```js
function setup() {
  new Canvas(400, 400);
  apples = new Group();
  for (let i = 0; i < 8; i++) {
    new apples.Sprite(40 + i * 45, 0);
  }
  for (let a of apples) a.vel.y = 4;
}
```

Eight apples falling in a row. Every one will pass `y > 410`.

<v-click>

We loop forward and delete the ones that fell off:

```js
for (let i = 0; i < apples.length; i++) {
  if (apples[i].pos.y > 410) apples[i].delete();
}
```

</v-click>

<v-click>

Predict: how many apples are left at the end?

(Your prediction is wrong. We'll see why.)

</v-click>

---

<script setup lang="ts">
const sketchBadDespawn = `let apples;

function setup() {
  new Canvas(400, 240);
  apples = new Group();
  apples.color = 'red';
  apples.diameter = 18;
  apples.collider = 'none';

  for (let i = 0; i < 8; i++) new apples.Sprite(40 + i * 45, 0);
  for (let a of apples) a.vel.y = 4;
}

function draw() {
  background('#113311');

  // BAD — forward loop while deleting.
  for (let i = 0; i < apples.length; i++) {
    if (apples[i].pos.y > 250) apples[i].delete();
  }

  fill('white');
  textSize(16);
  text('apples remaining: ' + apples.length, 12, 24);
}`;
</script>

# Live: the bug in the wild

<Q5Runner :code="sketchBadDespawn" :width="380" :height="240" />

Wait until every apple has fallen past the bottom. Read the counter.

You expect `apples remaining: 0`. You'll see **2–4 left over**.

---

# Why it skips

When `apples[2].delete()` runs, q5play splices that sprite out of the `apples` array. Everything to the right shifts down by one.

<div class="grid grid-cols-2 gap-6 mt-4 text-xs">
<div>

## Before delete (i = 2)

| index | sprite |
|-------|--------|
| 0 | apple A |
| 1 | apple B |
| **2** | **apple C** ← about to be deleted |
| 3 | apple D |
| 4 | apple E |

</div>
<div>

## After delete (i++ → 3)

| index | sprite |
|-------|--------|
| 0 | apple A |
| 1 | apple B |
| 2 | apple D ← shifted left, **never visited** |
| **3** | **apple E** ← loop now reads here |

</div>
</div>

<v-click>

The loop counter incremented past the apple that shifted into its place. **Every other doomed apple gets skipped.**

</v-click>

---

# Fix A — iterate backwards

```js
for (let i = apples.length - 1; i >= 0; i--) {
  if (apples[i].pos.y > 410) apples[i].delete();
}
```

<v-click>

When you delete index `i`, only indices **higher** than `i` shift — and you've already processed those. So nothing gets skipped.

The mental model: *walk from the end, prune as you go, never look back.*

</v-click>

---

# Fix B — iterate a copy

```js
for (let a of [...apples]) {
  if (a.pos.y > 410) a.delete();
}
```

<v-click>

`[...apples]` makes a **shallow copy** as a plain array. The original group can shift under you safely — the copy still holds every sprite reference.

This is the more readable form. Pick it unless you have a reason to write the backwards loop.

</v-click>

<v-click>

**The third safe place: inside an `overlaps` callback.** q5play has finished its own iteration before invoking your callback, so you can `delete()` freely. That's why Apple Catcher worked.

</v-click>

---
layout: center
class: text-center
---

# Q2 break (~2 min)

**Pair-and-share:**

You wrote a sketch. The cleanup loop is:

```js
for (let i = 0; i < bullets.length; i++) {
  if (bullets[i].y < 0) bullets[i].delete();
}
```

Players are reporting "sometimes a bullet just hangs there forever."

**What's the bug? Two ways to fix it?**

---
layout: section
---

# 4 · Edge-triggered input

The difference between "key is pressed" and "a press happened."

---

# `kb.pressing(k)` — every frame held

```js
if (kb.pressing('a'))      player.vel.x = -4;
else if (kb.pressing('d')) player.vel.x = 4;
else                       player.vel.x = 0;
```

`kb.pressing('a')` returns `true` for **every frame** the key is held. At 60 fps, that's 60 readings per second.

<v-click>

Right tool for **continuous** actions:

- Walking, running, sliding
- Hold-to-aim, hold-to-charge
- Hold-to-block

Wrong tool for one-shot actions, because "the key is held" stays `true` for many frames.

</v-click>

---

# `kb.presses(k)` — once per key-down

```js
if (kb.presses('space')) {
  player.vel.y = -10;
}
```

`kb.presses('space')` returns `true` for **exactly one frame** — the frame the key transitions from up → down. Hold it longer? Still just the first frame.

<v-click>

Right tool for **one-shot** actions:

- Jumping
- Shooting
- Toggling a flag
- Triggering a dash

The shape of the input — a single edge — matches the shape of the action.

</v-click>

---

# The infinite-jump bug

```js
// BUG — fires every frame the key is held.
if (kb.pressing('space')) {
  player.vel.y = -10;
}
```

<v-click>

Hold space for one second. `vel.y = -10` is set 60 times. Gravity tries to pull down between sets, but the upward impulse beats it every frame.

Result: the player **accelerates upward and never lands**.

</v-click>

<v-click>

The fix is one word — `pressing` → `presses`:

```js
// FIXED — fires once per tap.
if (kb.presses('space')) {
  player.vel.y = -10;
}
```

**Press*ing*** = currently being pressed (continuous). **Press*es*** = a press happened (discrete).

The verb tense matches the timing.

</v-click>

---

<script setup lang="ts">
const sketchPressesVsPressing = `let player, ground;

function setup() {
  new Canvas(380, 220);
  world.gravity.y = 20;

  ground = new Sprite(190, 210, 380, 12, 'static');
  ground.color = '#444';

  player = new Sprite(60, 100, 28, 28);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  // EDGE-TRIGGERED — one jump per tap.
  if (kb.presses('space')) {
    player.vel.y = -10;
  }

  fill('white');
  textSize(14);
  text('A/D to move · SPACE to jump (one per tap)', 12, 22);
}`;
</script>

# Live: tap, don't hold

<Q5Runner :code="sketchPressesVsPressing" :width="380" :height="220" />

Tap **SPACE** → one jump. Hold it → still one jump. Now swap `presses` to `pressing` and tap-and-hold. Watch the player rocket out the top.

---
layout: section
---

# 5 · Ground-gated jumps

`presses` fixes one bug. There's still another one waiting.

---

# `presses` alone is not enough

```js
if (kb.presses('space')) {
  player.vel.y = -10;
}
```

<v-click>

This fires once per tap — no infinite acceleration. Good.

But the player can still **tap mid-air**. Each tap = another jump. Tap-tap-tap = an unlimited fly cheat.

</v-click>

<v-click>

The missing gate: the player should **only jump if they are actually on the ground.**

</v-click>

---

# `sprite.touching(other)` — physics contact

```js
player.touching(ground)   // boolean: are these bodies in contact this frame?
```

<v-click>

Different from `overlaps`:

- **`overlaps`** — bounding-box intersection. Generous. Fires for any spatial overlap, including non-solid trigger zones and frames *before* a sprite has actually landed.
- **`touching`** — the physics engine says "yes, these bodies are in contact." Accurate for resting contact.

</v-click>

<v-click>

For "is the player on the ground?" — use `touching`, not `overlaps`. An overlap-gated jump still lets you fly because the bounding boxes overlap *while you're falling*.

</v-click>

---

# The ground-gated jump idiom

```js
if (kb.presses('space') && player.touching(ground)) {
  player.vel.y = -12;
}
```

<v-click>

Two gates, both must be true:

- **`kb.presses('space')`** — tap edge, not "key is held"
- **`player.touching(ground)`** — physically on the ground, not just spatially near it

</v-click>

<v-click>

Many platforms? Pass a Group instead of a single sprite:

```js
if (kb.presses('space') && player.touching(platforms)) {
  player.vel.y = -12;
}
```

Same idiom. Scales for free. **Memorize this line — every platformer ever shipped has a version of it.**

</v-click>

---

<script setup lang="ts">
const sketchGroundJump = `let player, ground;

function setup() {
  new Canvas(400, 280);
  world.gravity.y = 20;

  ground = new Sprite(200, 270, 400, 12, 'static');
  ground.color = '#444';

  player = new Sprite(60, 100, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  // The ground-gated jump idiom.
  if (kb.presses('space') && player.touching(ground)) {
    player.vel.y = -12;
  }

  fill('white');
  textSize(14);
  text('touching: ' + player.touching(ground), 12, 22);
}`;
</script>

# Live: try to fly

<Q5Runner :code="sketchGroundJump" :width="380" :height="260" />

Tap **SPACE** on the ground → jump. Tap mid-air → nothing. Delete `&& player.touching(ground)` and try to double-jump. Put it back.

---
layout: section
---

# Wrap up

Where you are, where you're going.

---

# A13.1 — Asteroid Field (Week 13 lab)

**SLO-3 + SLO-4 · Due end of Session 2**

Spawn a Group of asteroids on a timer. Steer a ship with WASD. Detect a hit; show "Game Over." Implement safe despawn for asteroids that fly off the canvas.

In-app lesson: **2.3.11 Asteroid Field**.

```js
asteroids = new Group();
asteroids.color = 'gray';

if (frameCount % 45 === 0) {
  let r = new asteroids.Sprite(/* random x, top of canvas */);
  r.vel.y = 2 + Math.random() * 2;
}

ship.overlaps(asteroids, (s, rock) => {
  /* TODO: end the game */
});
```

The grader checks the *requirements*, not that it "runs." Ship the real implementation.

---

# A14.1 — Space Jumper / Car Ramp (Week 14 lab)

**SLO-3 + SLO-4 · Due end of Session 4**

Pick one:

<div class="grid grid-cols-2 gap-6 mt-4 text-sm">
<div>

## Space Jumper

A platformer with **edge-triggered jump** + **ground gate** + collectibles. Score increases each pickup. Falling off the bottom resets.

In-app: **2.3.20 Space Jumper**.

</div>
<div>

## Car Ramp

A car physics demo using the **HingeJoint / WheelJoint** preview from 2.3.19 Pendulum. Drive over a ramp; track airtime.

In-app: **2.3.21 Car Ramp**.

</div>
</div>

<v-click>

Both labs are SLO-3 + SLO-4 evidence. Pick whichever interests you more — both touch every idea from this unit.

</v-click>

---

# Optional stretches (2.3.12 Challenges)

Done early?

<v-click>

**1. Lives counter** — extend Apple Catcher with a `rocks` Group. A rock hit subtracts a life. `lives <= 0` → "Game Over."

</v-click>

<v-click>

**2. Varied apples** — every spawn has a random `diameter` and `value`. Bigger apples = more points.

</v-click>

<v-click>

**3. `cull(group)` helper** — write a reusable function that deletes any sprite past the canvas edge. Replace your manual cleanup loop with one line.

</v-click>

---

# Quick reference card

Bookmark this slide.

| Symbol | What it means |
|--------|---------------|
| `new Group()` | Sprite-aware array with shared defaults + factory. |
| `new groupName.Sprite(...)` | Factory form — inherits group defaults. |
| `frameCount % N === 0` | Timed-spawn idiom. `N` is your difficulty knob. |
| `sprite.overlaps(group, cb)` | Per-pair callback — safe place to `delete()`. |
| `sprite.delete()` | Destroy sprite (body + every group). |
| `group.remove(sprite)` | Unparent only — sprite still exists. |
| `for (let s of [...group])` | Iterate-a-copy — safe with deletion. |
| `kb.pressing(k)` | Every frame the key is held (continuous). |
| `kb.presses(k)` | One frame per tap (one-shot). |
| `sprite.touching(other)` | Physics contact — use for ground gates. |

---

# Where 2.3 leaves you

You can spawn fleets, delete safely, and gate actions on edge-triggered input + physical contact.

<div class="grid grid-cols-2 gap-6 mt-4 text-sm">
<div>

## This unit you learned

- `Group` — collection + factory + defaults
- `overlaps` callback form for per-pair work
- The iterate-then-delete bug + two safe fixes
- `presses` vs `pressing` (edge vs continuous)
- `touching` for ground-gated jumps

</div>
<div>

## Next unit (2.4)

**Game state and scenes**

Title screens. Game-over flow. Pause/resume. Score persistence between rounds.

The bones of a finished, shippable game loop.

</div>
</div>

---
layout: center
class: text-center
---

# Questions?

Open **`/docs/q5play`** for the full `Group`, `overlaps`, and `kb` API reference.

**Next up:** 2.3.4 Worked Example — Iterating a Group, live in the in-app editor.

<div class="text-sm opacity-70 mt-8">
Every code block on these slides is editable — hit <kbd>Run</kbd> to see changes live.
</div>
