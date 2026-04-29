---
theme: default
title: "Unit 2.4 — Animation & Camera"
info: |
  Unit 2.4: state-driven animation, the camera as a coordinate transform, smoothing with lerp.
  Week 15 · Q2 · 2 class sessions.
  Covers: addAni / changeAni, sprite.image, camera.x follow pattern, lerp smoothing, sprite.layer.
class: text-center
transition: slide-left
mdc: true
---

<script setup lang="ts">
// @ts-ignore
import Q5Runner from './components/Q5Runner.vue'
</script>

# Unit 2.4 — Animation & Camera

**Week 15 · Quarter 2 · Two sessions**

Two things separate "my first sketch" from "this looks like a real game": animated sprites and a camera that follows the player.

<div class="text-sm opacity-70 mt-8">
Press <kbd>Space</kbd> or <kbd>→</kbd> to advance · <kbd>e</kbd> to open slide notes
</div>

---

# What you already know (Unit 2.3)

```js
let asteroids = new Group();
asteroids.color = 'gray';

if (frameCount % 30 === 0) {
  new asteroids.Sprite(random(0, 400), 0);
}

ship.overlaps(asteroids, (s, a) => a.delete());
```

- You can manage many sprites with one Group.
- `kb.presses` is edge-triggered; `kb.pressing` is level-triggered.
- Ground-gated jumps with `colliding` / `touching`.

<v-click>

**Pause. Think.**

The sketch above works — but the canvas is **always 400×400** and the player **never changes appearance**. What's missing?

</v-click>

---

# Two big ideas this week

<div class="grid grid-cols-2 gap-6 mt-4">
<div>

## 1. Animation

The player's visual changes when its **state** changes. Idle when standing, run when moving, jump when in the air. Same sprite — different appearance per frame.

</div>
<div>

## 2. Camera

The world is **larger than the canvas**. The viewport scrolls to follow the player. Walk right and the level slides past — sprites don't move, the camera does.

</div>
</div>

<v-click>

Each one is a one-liner you'll write in `draw()`. The mental model is the hard part.

</v-click>

---
layout: section
---

# 1 · Animation

State changes the visual.

---

# Animation = swap on state change

q5play's animation API is **state-driven**: register named animations once, then `changeAni(name)` whenever the player's state changes.

```js
sprite.addAni('idle', 'img/idle.png');
sprite.addAni('run',  'img/run1.png', 'img/run2.png');
sprite.changeAni('run');
```

<v-click>

The `frame loop never decides` what the sprite looks like. **Your input/state code does.**

</v-click>

---

# Without art assets, use emojis

The full `addAni` / `changeAni` pattern needs image files. For class — and for A15.1 — `sprite.image = '🧍'` does the same job with zero assets:

```js {monaco-run}
let player

function setup() {
  new Canvas(360, 240)
  player = new Sprite(180, 200, 40, 40)
  player.collider = 'none'
  player.image = '🧍'
}

function draw() {
  background('#222')
  if (kb.pressing('d')) { player.x += 3; player.image = '🏃' }
  else if (kb.pressing('a')) { player.x -= 3; player.image = '🏃' }
  else                       player.image = '🧍'
}
```

<Q5Runner :code="`let player\nfunction setup() { new Canvas(360, 240); player = new Sprite(180, 200, 40, 40); player.collider = 'none'; player.image = '🧍' }\nfunction draw() { background('#222'); if (kb.pressing('d')) { player.x += 3; player.image = '🏃' } else if (kb.pressing('a')) { player.x -= 3; player.image = '🏃' } else player.image = '🧍' }`" :width="360" :height="240" />

---

# The pattern that hides the bug

<div class="grid grid-cols-2 gap-6">
<div>

**Beginner mistake:**

```js
function draw() {
  if (kb.pressing('d')) {
    player.x += 3
    player.image = '🏃'
  }
}
```

The visual flips to `🏃` once and stays there forever — no `else` branch.

</div>
<div v-click>

**Working version:**

```js
function draw() {
  if (kb.pressing('d')) {
    player.x += 3
    player.image = '🏃'
  } else {
    player.image = '🧍'
  }
}
```

The `else` resets the visual when the input clears.

</div>
</div>

<v-click>

This is the same shape as a state machine. Forgetting the `else` branch is the #1 bug.

</v-click>

---

# Multiple states = priority order

```js
if (kb.pressing('w'))      player.image = '🤸'  // jump beats run
else if (kb.pressing('d')) { player.x += 3; player.image = '🏃' }
else if (kb.pressing('a')) { player.x -= 3; player.image = '🏃' }
else                       player.image = '🧍'
```

<v-click>

The order of `if` / `else if` decides which state **wins** when keys overlap. Jump is checked first because the player is *clearly* jumping if `W` is held — even if `D` is also held.

</v-click>

---

# Single-frame art

When a sprite shouldn't *cycle* (a coin, a flag, a rock) — skip `addAni` entirely. Just assign `sprite.image`:

```js
flag.image = '🚩'
coin.image = '🪙'
rock.image = '🪨'
```

For multi-frame animations, tune the cycle speed with `frameDelay`:

```js
sprite.addAni('run', 'img/run1.png', 'img/run2.png')
sprite.ani.frameDelay = 8   // higher = slower cycle
```

<v-click>

The grader for A15.1 accepts either form: `addAni` registrations OR multiple `sprite.image` assignments.

</v-click>

---
layout: section
---

# 2 · Camera

The world doesn't move. Your window does.

---

# The flashlight in a dark room

Imagine a dark room (the world). Your flashlight (the camera) lights up one patch at a time.

<v-click>

When you swing the flashlight to the right, the **room doesn't move**. The patch lit up changes.

</v-click>

<v-click>

That's `camera.x = player.x`. The world is fixed in place. The camera (your flashlight) tracks the player.

</v-click>

<v-click>

Sprites at `x = 1500` are always at `x = 1500`. Whether you can see them depends on where the camera is pointing.

</v-click>

---

# The follow line is one assignment

```js
function draw() {
  background('#224')

  if (kb.pressing('d'))      player.vel.x = 5
  else if (kb.pressing('a')) player.vel.x = -5
  else                       player.vel.x = 0

  // The follow line.
  camera.x = player.x
}
```

<v-click>

That's it. One assignment per frame.

</v-click>

---

# Live: a 2000px world in a 400px canvas

<Q5Runner :code="`let player\nfunction setup() { new Canvas(400, 240); world.gravity.y = 10; let g = new Sprite(1000, 220, 2000, 20, 'static'); g.color = '#554433'; for (let i = 0; i < 4; i++) { let p = new Sprite(250 + i*350, 160 - (i%2)*50, 100, 14, 'static'); p.color = '#776655' } player = new Sprite(80, 180, 28, 32); player.image = '🧍' }\nfunction draw() { background('#224'); if (kb.pressing('d')) player.vel.x = 5; else if (kb.pressing('a')) player.vel.x = -5; else player.vel.x = 0; if (kb.presses('w') && player.colliding(allSprites)) player.vel.y = -8; camera.x = player.x }`" :width="400" :height="240" />

Click in the preview, hold `D`, walk right. The world appears to scroll because the camera is moving — not because the platforms are.

---

# Comment out the camera line

<Q5Runner :code="`let player\nfunction setup() { new Canvas(400, 240); world.gravity.y = 10; let g = new Sprite(1000, 220, 2000, 20, 'static'); g.color = '#554433'; for (let i = 0; i < 4; i++) { let p = new Sprite(250 + i*350, 160 - (i%2)*50, 100, 14, 'static'); p.color = '#776655' } player = new Sprite(80, 180, 28, 32); player.image = '🧍' }\nfunction draw() { background('#224'); if (kb.pressing('d')) player.vel.x = 5; else if (kb.pressing('a')) player.vel.x = -5; else player.vel.x = 0; if (kb.presses('w') && player.colliding(allSprites)) player.vel.y = -8; }`" :width="400" :height="240" />

Same world. Player walks off the canvas — you can't see them anymore. The platforms at `x = 600, 950, 1300` exist; the canvas just isn't pointing at them.

---

# The hard follow feels glued

`camera.x = player.x` works, but it's rigid: every player pixel of motion = one pixel of camera motion. There's no *feel*.

<v-click>

Real games **soften** this. The camera trails behind, then catches up.

</v-click>

<v-click>

The fix: `lerp`.

</v-click>

---

# `lerp(current, target, t)` — interpolate

`lerp(a, b, t)` returns a value `t` of the way from `a` to `b`, where `t` is `0..1`.

```js
lerp(0, 10, 0.5)   // 5  — halfway
lerp(0, 10, 0.1)   //  1  — 10% of the way
lerp(0, 10, 1)     // 10  — all the way
```

<v-click>

For the camera:

```js
camera.x = lerp(camera.x, player.x, 0.1)
```

Each frame the camera closes **10%** of the gap between itself and the player. The gap shrinks asymptotically — never quite zero until the player stops.

</v-click>

---

# Live: lerp at t = 0.1

<Q5Runner :code="`let player\nfunction setup() { new Canvas(400, 240); world.gravity.y = 10; let g = new Sprite(1000, 220, 2000, 20, 'static'); g.color = '#554433'; for (let i = 0; i < 4; i++) { let p = new Sprite(250 + i*350, 160 - (i%2)*50, 100, 14, 'static'); p.color = '#776655' } player = new Sprite(80, 180, 28, 32); player.image = '🧍' }\nfunction draw() { background('#224'); if (kb.pressing('d')) player.vel.x = 5; else if (kb.pressing('a')) player.vel.x = -5; else player.vel.x = 0; if (kb.presses('w') && player.colliding(allSprites)) player.vel.y = -8; camera.x = lerp(camera.x, player.x, 0.1) }`" :width="400" :height="240" />

The player gets ahead, the camera catches up. That trailing motion is the whole point.

---

# Tuning t — there's no right answer

| `t` | Feel | Use case |
|-----|------|----------|
| `0.05` | Laggy — camera trails far behind | Cinematic / explore games |
| `0.1` | Soft — modern platformer default | Most cases |
| `0.3` | Snappy — closes most gap per frame | Twitchy action games |
| `0.5+` | Barely different from hard follow | Don't bother — use `=` |

<v-click>

Pick the value that **feels right** when you playtest. This is animation work, not math.

</v-click>

---

# `sprite.layer` — render order

Higher numbers draw on top of lower ones. Useful for HUD-style sprites that should sit above the world.

```js
let hud = new Sprite(40, 28, 32, 32)
hud.layer = 100        // always on top
hud.image = '⭐'

function draw() {
  // Pin the HUD to the camera so it doesn't slide with the world.
  hud.x = camera.x - 145
  hud.y = camera.y - 90
}
```

<v-click>

Default `layer` is 0. Negative values draw underneath everything.

</v-click>

---

# Parallax: depth via layer + slow factor

A second set of sprites drawn at a lower `layer` and positioned with a *fraction* of `camera.x`:

```js
for (let i = 0; i < clouds.length; i++) {
  clouds[i].x = i * 220 + camera.x * 0.3   // 30% of camera = parallax
  clouds[i].layer = -10                    // behind everything
}
```

<v-click>

The clouds move slower than the foreground because they only see 30% of the camera's motion. Brain reads that as **depth**.

</v-click>

<v-click>

This is a stretch challenge in `2.4.11` — not required for A15.1.

</v-click>

---
layout: section
---

# Putting it together

A15.1 — Side-Scrolling Platformer.

---

# A15.1 requirements (20 pts)

| Criterion | Pts |
|-----------|-----|
| Two animation states switching correctly | 4 |
| Camera follows player with visible scrolling | 5 |
| Three or more platforms create a real level | 3 |
| Working ground-gated jump | 3 |
| End goal detection + clear feedback | 3 |
| Background cleared each frame | 2 |
| **Total** | **20** |

<v-click>

Use placeholder emoji art. The grader doesn't know or care whether you used `addAni` or `sprite.image` swapping.

</v-click>

---

# The shape of A15.1

```js
let player, goal

function setup() {
  new Canvas(400, 300)
  world.gravity.y = 10

  // Wide ground + ≥3 static platforms across a level wider than 400.
  // Player sprite + initial visual.
  // Goal sprite at the far right.
}

function draw() {
  background('#224')

  // Read WASD; swap visual on motion.
  // Ground-gated jump: kb.presses('w') + player.colliding(allSprites).
  // camera.x = player.x  (or with lerp)
  // If player.overlaps(goal): text('You win!', ...)
}
```

<v-click>

Six requirements. Each one is one to three lines of code.

</v-click>

---

# Common bugs to watch

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

**Visual stays on `🏃`**

The `else` branch is missing. Add a default `sprite.image = '🧍'`.

**Player double-jumps**

`kb.pressing('w')` (level) instead of `kb.presses('w')` (edge). Or the `colliding` gate is missing.

</div>
<div>

**Camera doesn't follow**

`camera.x = player.x` is in `setup()` instead of `draw()`. The follow has to run every frame.

**Win message never shows**

`overlaps` works on overlap *pairs* — make sure the goal sprite has `collider = 'none'` so it doesn't push the player away.

</div>
</div>

---

# Stretch challenges (2.4.11)

<div class="grid grid-cols-3 gap-4 mt-4 text-sm">
<div>

## Parallax

Background sprites at low `layer`, positioned with `camera.x * 0.3`.

</div>
<div>

## Mirror sprite

`player.scale.x = -1` when walking left so it faces the right way; `1` to face right.

</div>
<div>

## Vertical follow

`camera.y = lerp(camera.y, player.y, 0.05)` for tall levels.

</div>
</div>

<v-click>

Optional. Worth the time if A15.1 is already done.

</v-click>

---

# Coming next: Unit 2.5 — State and Persistence

You can build a level. You can scroll. You can animate.

<v-click>

Now we'll add the things every game needs that you don't have yet:

</v-click>

<v-click>

- **Save/load** — high scores that survive a browser refresh.
- **Game states** — menu → play → win → game over, dispatched with `switch`.

</v-click>

<v-click>

A15.1 is your last "build it from scratch" before we layer state machines on top of it. Make it solid.

</v-click>

---

# Quick reference

| Pattern | Use |
|---------|-----|
| `sprite.image = '🧍'` | Single-frame visual; emojis work as zero-asset art. |
| `sprite.addAni(name, ...frames)` | Register a multi-frame animation. |
| `sprite.changeAni('run')` | Swap to a previously-registered animation. |
| `camera.x = player.x` | Hard follow — center the player on the canvas. |
| `lerp(camera.x, player.x, 0.1)` | Soft follow — close 10% of the gap per frame. |
| `sprite.layer = 100` | Draw above other sprites (HUD). |
| `sprite.layer = -10` | Draw below other sprites (parallax). |

---

# Questions?

You have until end-of-week-15 for A15.1.

Stretch (`2.4.11`) is optional but recommended if you finish early.

<div class="text-sm opacity-70 mt-12">
Open the Workspace — `2.4.5 Animated Sprites Sandbox` is your warm-up.<br>
`2.4.10 A15.1 Side-Scrolling Platformer` is the graded build.
</div>
