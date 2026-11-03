## Velocity: vel.x and vel.y

Read before `5.1.16 Reading: Movement pattern`. About 5 minutes.

By the end of this reading you should be able to answer:

- What does `player.vel.x = 4` do, and how does the sprite actually move?
- What happens if you set `vel.x = 50`?
- Why does the sprite keep moving after you set velocity once in `setup()`?
- What is different about moving a sprite with `vel` instead of changing its `pos` every frame?

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

**Moving by `pos` or by `vel`?**

In 5.1.9 a sprite moved because `draw()` changed its position every frame: `player.pos.x = player.pos.x + 1`. That works too, but it is not the same thing:

- With `pos`, **your code** moves the sprite. It jumps a few pixels every frame, whatever is in the way, and the engine is never told how fast it is going.
- With `vel`, you give the **engine** a speed and the engine moves the sprite. Because the engine knows the speed, it can work out what happens when the sprite bumps into another one.

Both squares below head for a gray box at the same speed, 3 pixels per frame. The blue one is moved by `pos`, the orange one by `vel`.

```js live
let blue, orange;

function setup() {
  new Canvas(400, 240);
  blue = new Sprite(40, 70, 30, 30);
  blue.color = 'deepskyblue';
  new Sprite(220, 70, 40, 40).color = 'gray';

  orange = new Sprite(40, 170, 30, 30);
  orange.color = 'orange';
  orange.vel.x = 3;   // vel: the engine moves it
  new Sprite(220, 170, 40, 40).color = 'gray';
}

function draw() {
  background('#222');
  blue.pos.x = blue.pos.x + 3;  // pos: your code moves it
}
```

**What you'll see:** the orange square reaches its box, slows down, and pushes the box along in a straight line, the way a real push works. The blue square is forced 3 pixels further into its box every frame while the engine keeps pushing it back out, so after a moment the two twist and the blue square squeezes past. That is why the movement code in this module uses `vel`: the engine handles the bumps.

> Next up: the movement pattern reading will show how to combine `kb.pressing` with `vel` so you control the direction.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`vel.x`** | Horizontal velocity in pixels per frame. Positive = right, negative = left. |
| **`vel.y`** | Vertical velocity in pixels per frame. Positive = down, negative = up. |
| **Pixels per frame** | How far a sprite travels each time `draw()` runs. At 60 fps, `vel.x = 4` is about 240 pixels per second. |
| **Position integration** | The engine's job: add `vel` to `pos` each frame. You set the speed; the engine moves the sprite. |
