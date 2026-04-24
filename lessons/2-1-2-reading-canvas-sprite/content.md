## Canvas & Sprite
**Read before attempting `2.1.5 Hello Sprite`.**

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

## Input
**Read before attempting `2.1.9 Make it Move`.**

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

