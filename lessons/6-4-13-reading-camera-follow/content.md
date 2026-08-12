## Locking the Viewport to a Sprite

**Read before attempting `2.4.8 Worked Example — Camera Follow`.**

**What you'll learn from it:**

- The canonical follow pattern is `camera.x = player.pos.x;` placed inside `draw()` — every frame the camera re-centers on the player.
- An offset like `camera.x = player.pos.x - canvas.w / 2 + 100` keeps the player off-center when your gameplay needs it.
- The player never visually moves on the canvas — the world scrolls beneath them.
- One line in `draw()` is all it takes; no extra setup in `setup()`.

**Try it:**

```js live
let player;

function setup() {
  new Canvas(400, 300);
  // Long static row for context.
  for (let x = 0; x <= 1500; x += 100) {
    let dot = new Sprite(x, 150, 20, 20, 'static');
    dot.color = '#88ff00';
  }
  player = new Sprite(100, 150, 30, 30);
  player.color = 'tomato';
}

function draw() {
  background('#222');
  // Follow the player: camera centers on them every frame.
  camera.x = player.pos.x;

  if (kb.pressing('d')) player.vel.x = 4;
  else if (kb.pressing('a')) player.vel.x = -4;
  else player.vel.x = 0;
}
```

Press **D** to walk right. The row scrolls left while the player stays centered — the world moves, not the player.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Follow camera** | A camera whose position is updated each frame to track a sprite. |
| **`camera.x = player.pos.x`** | The one-line canonical follow: re-centers the viewport on the player every frame. |
| **Camera offset** | Adjusting by `- canvas.w / 2 + N` to position the player off-center in the view. |
| **Viewport** | The visible area of the world rendered to the canvas. |
