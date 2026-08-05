## The world doesn't move — your window does

**Read before attempting `2.4.7a Reading — camera.x / camera.y`.**

The **camera** in shplay is a coordinate transform, not a "real" object. The canvas always shows a viewport into a coordinate space; sprites have absolute world coordinates. The camera holds the *center* of that viewport. When the player walks right, no sprite moves — the camera shifts, and the canvas redraws the new slice of the world. It's the flashlight analogy: the room (the world) is dark and full of stuff; your flashlight (the camera) points at one patch at a time.

**What you'll learn from it:**

- The world has absolute coordinates; sprites stay at their `pos.x` / `pos.y` regardless of where the camera is.
- The camera object holds the center of the visible viewport.
- The four atomic concepts each get their own reading next: `camera.x` / `camera.y` (2.4.7a), the follow pattern (2.4.7b), smoothing with `lerp` (2.4.7c), and render order with `sprite.layer` (2.4.7d).
- The default camera is centered on the canvas — every sprite created with the default camera setting renders relative to that initial center.

**Try it:** five static sprites at known x positions. The default camera centers the visible window; you don't need to do any camera work to see them. The next reading shows what changes when you assign `camera.x`.

```js live
function setup() {
  new Canvas(400, 240);
  for (let x = 60; x <= 340; x += 70) {
    let s = new Sprite(x, 120, 30, 30);
    s.collider = 'none';
  }
}

function draw() {
  background('#112');
}
```

The five sprites sit at `x = 60, 130, 200, 270, 340`. The default camera is centered on the canvas, so all five fall inside the viewport. In `2.4.7a` you'll move the camera and watch the same sprites slide out of view as the viewport shifts.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Camera** | The viewport into the world — moving it scrolls the view, not the sprites. |
| **Viewport** | The visible region of the world the canvas is currently rendering. |
| **World coordinates** | A sprite's absolute `pos.x` / `pos.y` — independent of the camera. |
| **Coordinate transform** | A shift applied at render time so the canvas can show a different slice of the same world without moving any sprite. |
