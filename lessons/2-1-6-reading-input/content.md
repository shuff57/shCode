# Input — keyboard + mouse

Read this before `2.1.9 Make it Move`. About 5 minutes.

By the end of this reading you should be able to:

- Read `kb.pressing('left')` and say what it returns and when.
- Set `player.vel.x` to make a sprite move.
- Explain why the `else` branch must set velocity to `0`.

You already know about `setup()`, `draw()`, `Canvas`, and `Sprite` from the last reading. This one adds **input** and **motion**.

---

## `kb.pressing(key)` — is the key held *right now*?

Inside `draw()`, you can ask the keyboard whether a specific key is currently held:

```js
if (kb.pressing('left')) {
  // this block runs every frame the left arrow is held
}
```

`kb.pressing(...)` returns `true` while the key is held and `false` the rest of the time. Because `draw()` runs 60 times a second, this `if` block runs about 60 times for every second you hold the key.

Common key names: `'left'`, `'right'`, `'up'`, `'down'`, `'space'`, `'a'`, `'w'`, `'s'`, `'d'`.

> Coming up in W14: `kb.presses('space')` (note the **s** at the end). That one fires *only on the first frame* the key is pressed, not every frame. Useful for jumping. You won't need it yet.

---

## `vel.x` and `vel.y` — how the sprite moves itself

Every sprite has a velocity. Velocity is **pixels per frame**:

- `player.vel.x = 4` → the sprite moves *right* 4 pixels every frame (≈ 240 pixels per second at 60 fps).
- `player.vel.x = -4` → moves *left* 4 pixels per frame.
- `player.vel.y = 4` → moves *down* (remember: y goes down on a canvas).
- `player.vel.y = -4` → moves *up*.

You don't call a `move()` function. The engine reads `vel` each frame and updates `pos` for you.

**Pick small numbers.** `vel.x = 4` already crosses the full canvas in about 1.5 seconds. `vel.x = 50` will launch the sprite off-screen before you can blink. Stick with **2–6** for everything you do this week.

---

## Putting it together — the standard movement pattern

```js live
let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if      (kb.pressing('left'))  player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x =  4;
  else                           player.vel.x =  0;

  if      (kb.pressing('up'))    player.vel.y = -4;
  else if (kb.pressing('down'))  player.vel.y =  4;
  else                           player.vel.y =  0;
}
```

**What you'll see:** a blue square in the middle. Click the preview to focus it, then hold an arrow key — the sprite moves. Let go — it stops.

**Try this:** change the `4`s to `2`s. Run it. Now change them all to `8`. Notice how the sprite gets harder to control as the speed goes up — that's why we keep velocities small.

---

## Why the `else` branch matters

This is the #1 bug in this module. Look closely at one piece of the pattern:

```js
if      (kb.pressing('left'))  player.vel.x = -4;
else if (kb.pressing('right')) player.vel.x =  4;
else                           player.vel.x =  0;   // ← this line
```

Without that last line, `vel.x` keeps whatever value it had on the *previous* frame. So the moment you press right, you set `vel.x = 4`. When you let go of the key, no `if` matches, and `vel.x` is *still* `4`. The sprite drifts forever.

The `else` says "if nothing is held, stop." Velocity is **not** automatically reset between frames — you reset it.

**Try this:** delete the two `else` lines (the ones that set `vel.x = 0` and `vel.y = 0`). Run it, tap an arrow once, and watch the sprite drift off-screen. Put the lines back.

---

## Use WASD, not the arrow keys, for graded work

In some browsers the arrow keys also scroll the page or the editor's iframe. That makes the canvas jump around while you play. For your **A10.1 Sprite Playground** lab, use `'a'`, `'d'`, `'w'`, `'s'` instead:

```js
if      (kb.pressing('a')) player.vel.x = -4;
else if (kb.pressing('d')) player.vel.x =  4;
else                       player.vel.x =  0;
```

The keys are different; the pattern is identical.

---

## Mouse input (preview — used later in W17)

You won't use these this week, but they exist:

- `mouse.x`, `mouse.y` — current mouse position, in canvas coordinates.
- `mouse.pressing()` — `true` while a mouse button is held. Note: it's a function call (with the `()`), not a property.

---

## Quick reference

| Function | When it's `true` |
|----------|------------------|
| `kb.pressing('left')` | Every frame the key is held. |
| `kb.presses('left')`  | Only the single frame it was first pressed (W14). |
| `mouse.pressing()`    | Every frame a mouse button is held. |

| Property | Meaning |
|----------|---------|
| `player.vel.x` | Horizontal speed, pixels per frame. Positive = right. |
| `player.vel.y` | Vertical speed, pixels per frame. Positive = **down**. |

---

Once you can explain why the `else` branch sets velocity to `0`, open `2.1.9 Make it Move` and start coding.
