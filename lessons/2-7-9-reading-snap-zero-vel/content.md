## Snap-and-zero-vel

When you want to drag a sprite, the obvious move is to set its position to the cursor each frame:

```js
sprite.pos.x = mouse.x;
sprite.pos.y = mouse.y;
```

That gets the sprite to the right place. But the physics engine still remembers the sprite's previous velocity. Even with the position snapped, the engine will nudge the sprite based on that stored velocity — you get a jitter or a drift on the next frame.

The fix is to zero both velocity components at the same time:

```js
sprite.pos.x = mouse.x;
sprite.pos.y = mouse.y;
sprite.vel.x = 0;
sprite.vel.y = 0;
```

Do all four lines together, every frame the drag is active. The sprite stays glued to the cursor.

**Try it:** hold the mouse button anywhere on the canvas — the square snaps to the cursor and follows it. Release to let gravity take over.

```js live
let s;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 5;
  s = new Sprite(200, 100, 40, 40);
}

function draw() {
  background('#282a36');

  if (mouse.pressing()) {
    s.pos.x = mouse.x;
    s.pos.y = mouse.y;
    s.vel.x = 0;
    s.vel.y = 0;
  }
}
```

This demo skips the hit-test on purpose — it isolates the snap-and-zero-vel mechanic so you can see it on its own. The full drag pattern (start only when the cursor is on the sprite, end on release) is built in the worked example next, on top of this four-line core.

Notice what happens if you comment out the two `vel` lines — the sprite jitters every time you change direction. The zero-vel step is what makes the drag feel solid.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Drag pattern** | While a drag is active: set `sprite.pos` to the cursor and zero `sprite.vel` each frame. |
| **Snap-and-zero-vel** | The combined four-line block that positions the sprite and clears physics momentum simultaneously. |
