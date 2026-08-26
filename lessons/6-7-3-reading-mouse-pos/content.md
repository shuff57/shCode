## Cursor position every frame

**Read before `6.7.4 Reading: moSHion docs: mouse.pressing()`.** About 5 minutes.

`mouse.x` and `mouse.y` are numbers that moSHion updates every frame. They hold the cursor's position in canvas coordinates: the same coordinate space your sprites live in. Top-left of the canvas is `(0, 0)`. Bottom-right is `(width, height)`.

Because moSHion updates them before each call to `draw()`, you can use them anywhere inside `draw()` without any extra setup.

**What you'll learn from it:**

- `mouse.x` is the horizontal cursor position this frame (in pixels from the left edge of the canvas).
- `mouse.y` is the vertical cursor position this frame (in pixels from the top edge of the canvas).
- Both values update automatically: you never assign them yourself.
- They use the same coordinate system as `sprite.pos.x` and `sprite.pos.y`.

**Try it:** run the sketch and move your cursor around the canvas. The numbers update every frame.

```js live
function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');
  fill('#f8f8f2');
  textSize(20);
  text('x: ' + mouse.x + '   y: ' + mouse.y, 20, 40);
}
```

**What you'll see:** the current x and y position of your cursor printed in the upper-left. Move the cursor to a corner and watch both numbers change.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`mouse.x`** | Cursor's horizontal position this frame, in canvas pixels from the left edge. |
| **`mouse.y`** | Cursor's vertical position this frame, in canvas pixels from the top edge. |
| **Canvas coordinates** | The (0, 0) origin is the top-left corner of the canvas. x increases right; y increases down. |
