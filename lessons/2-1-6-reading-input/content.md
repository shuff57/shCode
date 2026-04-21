# 2.1.1 Readings

Required and reference reading for Module 2.1.1.

**Other 2.1.1 resources:** [overview](2.1.1_overview.md) · [worked examples](2.1.1_worked-examples.md) · [challenges](2.1.1_challenges.md) · [video manifest](2.1.1_video-manifest.md) · lab [A10.1](A10.1_sprite-playground.md) · writeup [A10.2](A10.2_frame-loop-writeup.md)

---

## Primary reading — in-app q5play docs

The course platform hosts the complete q5play docs at:

**[/docs/q5play](/docs/q5play)** (open in the same browser window you use for lessons)

For this module, focus on two chapters:

### R1 — "Canvas & Sprite" chapter
**Read before attempting `2.1.1a Hello Sprite`.**

What you'll learn from it:
- How `new Canvas(width, height)` sets up the drawing area.
- What properties a `Sprite` has (`color`, `pos`, `vel`, `rotation`, `layer`).
- How sprites are rendered automatically each frame — you don't call a `render()` method.
- When to store a sprite in a variable outside `setup()` vs inline inside `draw()`.

**Try it:** edit the sprite's color, size, or position and hit Run.

```js live
let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 60, 60);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}
```

### R2 — "Input" chapter
**Read before attempting `2.1.1b Make it Move`.**

What you'll learn from it:
- `kb.pressing(key)` — returns `true` every frame the key is held.
- `kb.presses(key)` — fires exactly once per key-down (you'll use this in W14).
- Supported key names: `'left'`, `'right'`, `'up'`, `'down'`, `'a'`, `'w'`, `'s'`, `'d'`, `'space'`, etc.
- Mouse input: `mouse.x`, `mouse.y`, `mouse.pressing()` (used in W17).

**Try it:** click the preview to focus it, then hold arrow keys to move the sprite.

```js live
let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
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

---

## Short glossary (quick reference)

| Term | Definition |
|------|-----------|
| **`setup()`** | Function you write. Runs **once** when the sketch starts. Build your world here. |
| **`draw()`** | Function you write. Runs **every frame** (≈60 times/sec). Handle input and update state here. |
| **`Canvas(w, h)`** | Creates the drawing area. Call once in `setup()`. |
| **`Sprite(x, y, w, h)`** | Creates a visual + physics object. |
| **`background(color)`** | Clears the canvas to a color. Must be called first inside `draw()` or old frames will stack. |
| **`vel.x` / `vel.y`** | Velocity in pixels-per-frame. At 60 fps, `vel.x = 4` = 240 pixels/sec. |
| **`frameCount`** | A global counter — increments by 1 each frame. Useful for timing and animation. |

---

## How to read the docs efficiently

1. **Skim first** — get a sense of what sections exist.
2. **Read the function signatures** — `Sprite(x, y, w, h)` tells you exactly what arguments it wants.
3. **Copy the examples into the editor and run them** — reading alone is not enough. Modify one number, see what changes.
4. **Search before asking** — `Ctrl+F` in the docs page will find most things faster than asking the teacher.
