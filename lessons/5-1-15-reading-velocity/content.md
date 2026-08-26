## Velocity: vel.x and vel.y

Read before `2.1.7b Reading: Movement pattern`. About 5 minutes.

By the end of this reading you should be able to answer:

- What does `player.vel.x = 4` do, and how does the sprite actually move?
- What happens if you set `vel.x = 50`?
- Why does the sprite keep moving after you set velocity once in `setup()`?

You already know how to create a Canvas and a Sprite. This reading adds one idea: how a sprite moves itself through space using velocity.

**What you'll learn from it:**

- `player.vel.x` is the sprite's horizontal speed in **pixels per frame**.
- `player.vel.y` is the vertical speed in pixels per frame.
- The engine reads `vel` every frame and updates the sprite's `pos` for you: you never call a `move()` function.
- Positive `vel.x` moves right; negative moves left. Positive `vel.y` moves **down** (y increases downward on a canvas).
- Keep velocity values small: **2 to 6** is plenty. `vel.x = 50` will launch the sprite off-screen before you can blink.

**Try it:**

```js live
let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(40, 180, 40, 40);
  player.color = 'deepskyblue';
  player.vel.x = 4;   // set once: engine carries it forward every frame
}

function draw() {
  background('#222');
}
```

**What you'll see:** a blue square that drifts right on its own. You never update it in `draw()`: `vel.x = 4` was set once in `setup()` and the engine applies it every frame.

**Try this:** change `4` to `-4` (moves left), then to `2` (slower), then to `8` (faster). Try setting `player.vel.y = 3` at the same time and watch what happens to the direction.

> Next up: the movement pattern reading will show how to combine `kb.pressing` with `vel` so you control the direction.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`vel.x`** | Horizontal velocity in pixels per frame. Positive = right, negative = left. |
| **`vel.y`** | Vertical velocity in pixels per frame. Positive = down, negative = up. |
| **Pixels per frame** | How far a sprite travels each time `draw()` runs. At 60 fps, `vel.x = 4` is about 240 pixels per second. |
| **Position integration** | The engine's job: add `vel` to `pos` each frame. You set the speed; the engine moves the sprite. |
