# 5.1.18 Worked Examples

Teacher-led walkthroughs for Module 5.1. Students can come back to them when building 5.1.23 Sprite Playground.

Each example builds up one step at a time. The code in the steps is there to read, one change at a time; each example ends with a block you can run and change right here.

**Elsewhere in Module 5.1:** 5.1.24 Frame Loop Writeup · 5.1.25 Challenges

---

## Worked Example 1: Minimum sprite program

**Goal:** Prove that a canvas + sprite + background is the smallest possible moSHion program. This is the program from 5.1.4 again, as a reminder.

### Step 1: The first try

```js
function setup() {
  new Canvas(400, 400);
}

function draw() {
  background('#222');
  new Sprite(200, 200, 40, 40);
}
```

This puts a square in the middle of a dark canvas, and then something goes wrong.

### Step 2: Notice the bug

**Where is the sprite being created?** Inside `draw()`. That means a **new sprite is being made every frame**: 60 per second. If you run this for 5 seconds, 300 sprites exist. Every new one starts in the same spot, but sprites are solid and push each other apart, so squares keep piling up and spreading out until they cover the whole canvas. You watched this happen in 5.1.4.

### Step 3: Hoist the sprite

Move the sprite creation OUT of `draw()` and INTO `setup()`. Store it in a variable so we can still reach it later.

```js
let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}
```

Run the block below. **One** sprite exists. It's rendered automatically every frame: you don't call any render function. The engine sees the sprite in its world and draws it for you.

**Try the combined final: tweak and Run:**

```js live
let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}
```

### Key takeaways

- `setup()` runs **once**. Create long-lived things here.
- `draw()` runs **every frame**. Do per-frame things here (input, movement, scoring).
- You don't call a render method on a sprite. moSHion handles rendering.
- `background(...)` is the first thing in `draw()`. Skip it and old frames stack up like a long-exposure photo.

---

## Worked Example 2: Keyboard movement

**Goal:** Make the sprite respond to the keyboard.

Start from Worked Example 1's final code.

### Step 1: Add horizontal movement

```js
function draw() {
  background('#222');
  if (kb.pressing('left'))  player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;
}
```

With this `draw()`, holding the left arrow moves the sprite left and holding the right arrow moves it right. Let go of both and the **sprite stops**, because of the `else` branch.

### Step 2: Break it on purpose

Comment out the `else` branch:

```js
  if (kb.pressing('left'))  player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  // else player.vel.x = 0;  ← commented out
```

Try it in the block at the end of this example: put `//` in front of the first `else` line (the one that sets `player.vel.x` to `0`), Run, click the canvas, hold the left arrow, then let go. **The sprite drifts forever.** This is the **drifting sprite bug**: the #1 bug students hit this week.

Why? A velocity stays until your code changes it. `vel.x` keeps its last value (−4), and without the `else`, nothing sets it back to `0` when you let go.

Put the `else` back.

### Step 3: Add vertical movement

```js
function draw() {
  background('#222');
  if (kb.pressing('left'))  player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;

  if (kb.pressing('up'))    player.vel.y = -4;
  else if (kb.pressing('down')) player.vel.y = 4;
  else player.vel.y = 0;
}
```

Remember: **up is negative y** in screen coordinates. This is different from math class.

**Try the combined final: hold arrow keys to move:**

```js live
let player;

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
}
```

### Key takeaways

- `kb.pressing(key)` is **level-triggered**: true every frame while the key is held.
- **Always include the `else` branch** that sets the velocity back to `0`. Leaving it out is the most common bug in this module.
- Y-axis is flipped compared to math class. Up = negative, down = positive.

---

## Cheat sheet

```js
// Minimum program
function setup() {
  new Canvas(400, 400);
}
function draw() {
  background('#222');
}

// Hoist a sprite
let player;
function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

// Keyboard: else-to-zero is critical
if (kb.pressing('a')) player.vel.x = -4;
else if (kb.pressing('d')) player.vel.x = 4;
else player.vel.x = 0;
```
