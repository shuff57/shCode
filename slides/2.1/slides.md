---
theme: default
title: "Module 2.1 — q5play Foundations"
info: |
  Module 2.1: q5play Foundations.
  Week 10 · Q2 · 2 class sessions.
  Covers: canvas, sprites, frame loop, keyboard input.
class: text-center
transition: slide-left
mdc: true
---

# Module 2.1 — q5play Foundations

**Week 10 · Quarter 2 · Two sessions**

Your code is about to become visual.

<div class="text-sm opacity-70 mt-8">
Press <kbd>Space</kbd> or <kbd>→</kbd> to advance · <kbd>e</kbd> to open slide notes
</div>

---

# What you already know (Q1)

```js
let name = "Maria";
let age = 17;

if (age >= 18) {
  console.log(name + " is an adult");
} else {
  console.log(name + " is a minor");
}
```

**You can:** declare variables, use conditionals, loops, functions, arrays.
**You've seen:** all output via `console.log`.

<v-click>

This week: the same JavaScript drives **a visual game engine**.

</v-click>

---

# q5play — what it is

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Built on two layers

- **q5.js** — a fast, tiny p5.js-compatible drawing engine
- **Box2D** — the physics engine used in real 2D games

Runs entirely in your browser. **No installs.**

</div>
<div>

## What you'll build in Q2

- A controllable sprite (today)
- Physics + gravity (W11)
- Your own classes (W12)
- Spawning enemies (W13)
- A complete game (**W18 capstone**)

</div>
</div>

---

# The program skeleton

Every q5play sketch has **two functions** (or three):

```js
function setup() {
  // runs ONCE when the sketch starts
  // build your world here
}

function draw() {
  // runs EVERY FRAME — about 60 times per second
  // input, movement, scoring, redraw
}
```

<v-click>

**Key mental model:**

- `setup()` = "make the world"
- `draw()` = "what happens each frame"

</v-click>

---

<script setup lang="ts">
const sketchMinimum = `function setup() {
  new Canvas(400, 400);
}

function draw() {
  background('#222');
  new Sprite(200, 200, 40, 40);
}`;
</script>

# Your first sketch — let's run it

<Q5Runner :code="sketchMinimum" :width="320" :height="320" />

Edit the code on the left, hit **Run**. Try changing the canvas size, the sprite position, the background color.

---

# ⚠️ But there's a bug

Look at the code again:

```js {3-6|5}
function draw() {
  background('#222');
  new Sprite(200, 200, 40, 40);   // ← where is this?
}
```

<v-click>

- `draw()` runs **60 times per second**
- A new sprite is created **every frame**
- After 10 seconds: **600 sprites** — all stacked at the same spot

</v-click>

<v-click>

**Fix:** hoist the sprite OUT of `draw()` and INTO `setup()`.

</v-click>

---

<script setup lang="ts">
const sketchHoisted = `let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}`;
</script>

# The hoisted version

<Q5Runner :code="sketchHoisted" :width="320" :height="320" />

**One** sprite, created once, drawn automatically every frame.

---

# Sprite properties

Every Sprite has these (change them any time):

| Property | What it does |
|----------|--------------|
| `.color` | sprite color (CSS name, `#hex`, or `rgba(...)`) |
| `.pos.x` / `.pos.y` | position in pixels |
| `.vel.x` / `.vel.y` | velocity in pixels-per-frame |
| `.rotation` | rotation in degrees |
| `.layer` | render order (higher = on top) |

Try changing `player.color = 'deepskyblue'` to `'hotpink'` or `'#ff5555'`.

---

# The frame loop — how fast?

<div class="grid grid-cols-2 gap-8">
<div>

q5play runs at **≈60 frames per second**.

If `player.vel.x = 4`:

- 4 pixels per frame
- × 60 frames = **240 px/sec**
- On a 400-px canvas: crosses in **1.67 sec**

</div>
<div>

## Pick small numbers

- ✅ 2, 3, 4 — readable motion
- ⚠️ 10 — fast but usable
- ❌ 50 — off-screen instantly

</div>
</div>

<v-click>

**Why give us `vel` at all?** So physics (gravity, collisions) can integrate with your motion. Assigning `pos.x` directly fights the engine.

</v-click>

---

# Keyboard input — the q5play pattern

```js
if (kb.pressing('left'))       player.vel.x = -4;
else if (kb.pressing('right')) player.vel.x = 4;
else                           player.vel.x = 0;
```

<v-click>

- `kb.pressing('left')` returns **`true` every frame** the key is held
- The `else` branch is **critical** — it resets velocity to 0 when no key is pressed
- Skip the `else` → sprite drifts forever

</v-click>

---

<script setup lang="ts">
const sketchKeyboard = `let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else                           player.vel.x = 0;

  if (kb.pressing('up'))         player.vel.y = -4;
  else if (kb.pressing('down'))  player.vel.y = 4;
  else                           player.vel.y = 0;
}`;
</script>

# Run it live

<Q5Runner :code="sketchKeyboard" :width="340" :height="340" />

Click the game, then hold arrow keys. Try commenting out an `else` branch — watch the drift.

---

# Screen coordinates

**Y axis is flipped** compared to math class.

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Screen (q5play)

- Up → **negative** y (`vel.y = -4`)
- Down → **positive** y (`vel.y = 4`)
- Origin (0, 0) is **top-left**

</div>
<div>

## Math class

- Up → positive y
- Origin (0, 0) is bottom-left or center

</div>
</div>

<v-click>

Don't fight it — just remember: **to go up, use negative `vel.y`**.

</v-click>

---

# ⚠️ Why not arrow keys for labs?

Arrow keys also **scroll the browser iframe**. Your sprite fights the page scroll.

<div class="grid grid-cols-2 gap-8 mt-8">
<div>

## For labs, use WASD

```js
if (kb.pressing('a')) player.vel.x = -4;
else if (kb.pressing('d')) player.vel.x = 4;
else player.vel.x = 0;
```

</div>
<div>

## Standalone Run button

Arrow keys are fine when you Run in a full page — only problematic in the embedded editor.

</div>
</div>

---

# Automatic motion — the `frameCount` trick

Need a sprite that moves on its own?

```js
mover.pos.x = 400 + sin(frameCount * 0.05) * 80;
```

- `frameCount` increases by 1 every frame
- `sin(...)` oscillates between -1 and +1
- Multiply to set the range; add an offset to center

<v-click>

**Variations:**
- Circle: use both `sin` and `cos`
- Spin: `sprite.rotation = frameCount * 2`
- Slower: reduce the `0.05` multiplier

</v-click>

---

<script setup lang="ts">
const sketchCompanion = `let player, companion;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 300, 30, 30);
  player.color = 'deepskyblue';

  companion = new Sprite(0, 0, 20, 20);
  companion.color = 'orange';
}

function draw() {
  background('#222');

  if (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else player.vel.x = 0;

  // orbit around the player
  companion.pos.x = player.pos.x + cos(frameCount * 0.05) * 60;
  companion.pos.y = player.pos.y + sin(frameCount * 0.05) * 60;
}`;
</script>

# Run it — orbiting companion

<Q5Runner :code="sketchCompanion" :width="340" :height="340" />

---

# Common bugs this week

<div class="text-lg">

| Bug | Cause | Fix |
|-----|-------|-----|
| Sprite trails / never clears | No `background()` in `draw()` | Call `background(...)` first |
| Sprite drifts forever | Missing `else` branch | Set `vel = 0` in else |
| Canvas fills with sprites | `new Sprite()` in `draw()` | Hoist to `setup()` |
| Sprite launches off-screen | `vel` too high | Use 2–6 |
| Up/down backwards | Math-class thinking | Up = negative y |

</div>

---

# Today's in-app work

<div class="grid grid-cols-2 gap-8">
<div>

## Session 1

1. 🎥 Video: your first sketch
2. 📖 Reading: Canvas & Sprite
3. 💡 Worked example (this deck)
4. ▶️ **Hello Sprite** lesson (~20 min)
5. 🎥 Video: the frame loop
6. AP CSP: how q5play reached your browser

</div>
<div>

## Session 2

1. 📖 Reading: Input
2. 💡 Worked example: keyboard
3. ▶️ **Make it Move** lesson (~25 min)
4. ✏️ **A10.1 Sprite Playground** lab
5. ✍️ **A10.2** writeup
6. ⭐ Challenges (optional)

</div>
</div>

---

# A10.1 — Sprite Playground (preview)

**Due end of week · 15 points · SLO 3**

Build a sketch with:
- A canvas 300×300 to 800×600
- One controllable sprite (WASD)
- One auto-moving sprite using `frameCount`
- An on-screen text label at the top
- `background()` at the start of `draw()`
- The else-to-zero pattern on both axes

<v-click>

Combines everything from today's two lessons. No new tricks — just glue.

</v-click>

---

# A10.2 — Frame Loop Writeup (preview)

**Due end of week · 5 points · Written**

Three questions, half a page total:

1. What's the difference between `setup()` and `draw()`? When does each run?
2. At 60 fps with `vel.x = 4`: how far in 1 sec? 5 sec? Time to cross a 400-px canvas?
3. Why does the engine give us `vel` instead of letting us set `pos.x` directly?

---

# What's next — Week 11

**Physics Feel** — module 2.2

- `world.gravity.y = 10` → things fall
- `sprite.bounciness = 0.8` → things bounce
- `dynamic` vs `static` vs `kinematic` sprite bodies
- A11.1: build a pinball scene

And beyond that (W12+): OOP, groups, animation, save/load, capstone.

---
layout: center
class: text-center
---

# Questions?

**Try it:** open the in-app Hello Sprite lesson now.

<div class="text-sm opacity-70 mt-8">
All code in these slides is editable — hit <kbd>Run</kbd> to see changes live.
</div>
