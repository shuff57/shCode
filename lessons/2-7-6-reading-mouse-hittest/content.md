## Is the cursor over a sprite?

**Read before `2.7.7 Worked Example — Click to Spawn a Sprite`.** About 5 minutes.

A hit-test answers one question: is the cursor currently over this sprite? You need the answer before starting a drag — you only want the drag to begin when the player clicks directly on the sprite, not anywhere on the canvas.

q5play gives you `world.getSpriteAt(x, y)`. Pass it the cursor coordinates and it returns the top-most sprite at that point — or `undefined` if there isn't one.

```js
world.getSpriteAt(mouse.x, mouse.y)
```

To check whether the cursor is over a specific sprite, compare the result with `===`:

```js
if (world.getSpriteAt(mouse.x, mouse.y) === box) {
  // cursor is over `box`
}
```

**What you'll learn from it:**

- `world.getSpriteAt(x, y)` returns the sprite under that point, or `undefined`.
- Use `===` to compare against the sprite you care about.
- The result is fresh every frame, so you can read it inside `draw()`.
- This is the standard pattern for gating a drag — check the hit-test on `mouse.presses()` to start the drag only on a direct click.

**Try it:** run the sketch and move your cursor onto the blue square. It turns green. Move off — it turns back to blue.

```js live
let box;

function setup() {
  new Canvas(400, 300);
  box = new Sprite(200, 150, 80, 80);
  box.color = '#6272a4';
  box.collider = 'none';
}

function draw() {
  background('#282a36');

  if (world.getSpriteAt(mouse.x, mouse.y) === box) {
    box.color = '#50fa7b';
  } else {
    box.color = '#6272a4';
  }
}
```

**What you'll see:** the square changes color when the cursor enters it and changes back when the cursor leaves.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Hit-test** | Checking whether a point (here, the cursor) is over a sprite. |
| **`world.getSpriteAt(x, y)`** | Returns the top-most sprite at the given point, or `undefined`. Compare with `===` to test against a specific sprite. |
