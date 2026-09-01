## Sprite: new Sprite(x, y, w, h)

Read before `5.1.7 Lab: Drop one sprite, change its color`. About 5 minutes.

By the end of this reading you should be able to answer:

- What do the four numbers inside `new Sprite(...)` control?
- Do you need to call a `draw()` or `render()` method to make the sprite appear?
- How do you change a sprite's fill color when you create it?

A **sprite** is a visible, physics-aware rectangle that moSHion draws for you every frame. You create one with `new Sprite(x, y, width, height)` and the engine takes care of rendering it automatically.

**What you'll learn from it:**

- The four arguments are: centre-x, centre-y, width, height, in that order.
- `x` and `y` point to the sprite's **centre**, not its top-left corner.
- You do **not** call any render method; moSHion draws the sprite for you each frame.
- You can set `.color` on a sprite right after creating it: same statement, no extra setup.

**Try it: basic sprite:**

```js live
function setup() {
  new Canvas(360, 360);
  new Sprite(180, 180, 60, 60);
}

function draw() {
  background('#222');
}
```

**What you'll see:** a default-colored square centred in a dark-grey canvas. moSHion drew it for you: you never called any render function.

**Try this:** change `180, 180` to `50, 50` inside `new Sprite(...)` and rerun. The square jumps to the upper-left area because `y = 50` is near the top (remember: `y` increases downward).

**Try it: set the color:**

```js live
function setup() {
  new Canvas(360, 360);
  new Sprite(180, 180, 60, 60).color = 'tomato';
}

function draw() {
  background('#222');
}
```

The `.color = 'tomato'` chained onto `new Sprite(...)` reads left-to-right as: "create the sprite, then set its `.color` to `'tomato'`." Both happen in one statement.

**What you'll see:** the same square, now red.

**Try this:** swap `'tomato'` for `'deepskyblue'`, then for `'#88ff00'` (a hex color code). Each run shows a different fill.

> *Heads-up:* the next reading (`5.1.8`) shows a different way to write this: store the sprite in a `let` variable so you can change its color later, not just at creation. For now, the chained form is enough.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Sprite** | A visible, physics-aware rectangle moSHion draws for you every frame. |
| **`new Sprite(x, y, w, h)`** | Creates a sprite at centre `(x, y)` with the given width and height. |
| **`.color`** | A sprite property. Set it to any CSS color string to change the fill. |
| **Centre position** | `x` and `y` in `new Sprite(...)` point to the sprite's centre, not its corner. |
