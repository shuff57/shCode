## Smooth Follow with lerp

**Read before attempting `2.4.9 Worked Example — Smooth Camera with lerp`.**

**What you'll learn from it:**

- `lerp(current, target, t)` returns a value `t`-fraction of the way from `current` to `target`.
- Replacing `camera.x = player.pos.x` with `camera.x = lerp(camera.x, player.pos.x, 0.1)` makes the camera trail the player like it's on a stretchy spring.
- Small `t` (0.05–0.1) gives a smooth lag; large `t` (0.5+) snaps closely to the target.
- `lerp` is also useful anywhere you want eased motion — UI transitions, value blending, color fades.

**Try it:**

```js live
let player;

function setup() {
  new Canvas(400, 300);
  for (let x = 0; x <= 1500; x += 100) {
    let dot = new Sprite(x, 150, 20, 20, 'static');
    dot.color = '#88ff00';
  }
  player = new Sprite(100, 150, 30, 30);
  player.color = 'tomato';
}

function draw() {
  background('#222');
  // Smooth follow: camera eases toward the player each frame.
  // Try changing 0.1 to 0.05 (laggy) or 0.5 (snappy).
  camera.x = lerp(camera.x, player.pos.x, 0.1);

  if (kb.pressing('d')) player.vel.x = 4;
  else if (kb.pressing('a')) player.vel.x = -4;
  else player.vel.x = 0;
}
```

Walk right with **D**, then stop. Notice the camera overshoots slightly and eases in. Edit `0.1` to `0.05` and `0.5` and feel the difference.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`lerp(a, b, t)`** | Linear interpolation — returns `a + t * (b - a)`, a value `t`-fraction from `a` to `b`. |
| **Easing** | Smooth blending of motion via interpolation — makes movement feel elastic or weighted. |
| **`t` factor** | Controls lerp speed: `0.05` = slow/laggy, `0.1` = smooth spring, `0.5+` = snappy. |
| **Follow camera** | A camera whose position tracks a sprite, updated each frame in `draw()`. |
