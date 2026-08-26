## Moving the Viewport

**Read before attempting `2.4.7b Reading: Camera-follow pattern`.**

**What you'll learn from it:**

- `camera.x` and `camera.y` are the **center** of the visible area in world coordinates.
- Their default of `(canvas.w / 2, canvas.h / 2)` keeps the viewport centered on the world's `(0, 0)` origin.
- Assigning a new value shifts the view; no sprite's `pos.x` or `pos.y` changes.
- The change takes effect on the **next** frame's render.

**Try it:**

```js live
function setup() {
  new Canvas(400, 300);
  // Spawn a long row of dots across the world.
  for (let x = 0; x <= 1500; x += 100) {
    let dot = new Sprite(x, 150, 20, 20, 'static');
    dot.color = '#88ff00';
  }
}

function draw() {
  background('#222');
  // Move the viewport right by 1 pixel every frame.
  camera.x += 1;
}
```

Watch the row of dots scroll past as `camera.x` grows. No sprite moved, only the viewport shifted.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`camera.x` / `camera.y`** | The center of the visible viewport in world coordinates. |
| **Viewport** | The rectangular window into the world that is rendered to the canvas. |
| **World coordinates** | A sprite's absolute `pos.x` / `pos.y`, independent of camera position. |
| **Default camera** | `camera.x = canvas.w / 2`, `camera.y = canvas.h / 2`: the view starts at the world origin, so a sprite at `(0, 0)` sits in the canvas's top-left corner. |
