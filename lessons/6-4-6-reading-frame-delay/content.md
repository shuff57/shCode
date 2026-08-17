## Slowing or Speeding the Animation Cycle

**Read before attempting `6.4.9 Animated Sprites Sandbox`.**

**What you'll learn from it:**

- `sprite.ani.frameDelay = N` sets how many game frames each animation frame holds — a higher number means a slower cycle.
- The default value is `4` (four game frames per animation frame, ~15 cycles per second at 60fps).
- The property lives on the sprite's **active animation** (`sprite.ani`), so set it after `changeAni` if you want different pacing per state.
- Single-frame art is unaffected — there is nothing to advance when the cycle has only one frame.

**Try it:**

This try-it loads the ghost flying animation (4 frames). Hold `Space` to slow the cycle to a crawl, release to return to the default speed. Watch the wing-flap pace change.

```js live
let ghost;

function setup() {
  new Canvas(400, 200);
  ghost = new Sprite(200, 100, 80, 80);
  ghost.collider = 'none';
  ghost.addAni('fly', '/shplay/assets/ghost_fly.avif', 4);
}

function draw() {
  background('#222');

  // Toggle the active animation's frameDelay.
  // Default is 4 — pressing Space bumps to 24 (six times slower).
  if (kb.pressing(' ')) {
    ghost.ani.frameDelay = 24;
  } else {
    ghost.ani.frameDelay = 4;
  }

  fill(255);
  textSize(14);
  text('Hold SPACE for slow-mo', 110, 30);
  text('frameDelay: ' + ghost.ani.frameDelay, 140, 180);
}
```

Hit Run — the ghost flaps at a normal pace. Hold Space — the wings move ~6× slower. Two things to notice:

1. **`frameDelay` is a property on the active animation, not the sprite.** That's why we write `ghost.ani.frameDelay`, not `ghost.frameDelay`. `ghost.ani` is a shortcut for "whichever animation is currently active."
2. **Higher number = slower cycle.** A `frameDelay` of `4` means "hold each frame for 4 game frames before advancing"; `24` means hold each frame for 24 game frames. Inverse intuition: think of it as "how long to wait before the next frame," not "frames per second."

**Per-state pacing.** If you've registered `'idle'` and `'run'` (as in 2.4.3b), you can give each its own pace by calling `changeAni` first, then setting `frameDelay`:

```js
ghost.changeAni('idle');
ghost.ani.frameDelay = 16;   // slow, lazy hover

ghost.changeAni('fly');
ghost.ani.frameDelay = 4;    // snappy, urgent flap
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`frameDelay`** | Game frames per animation frame. Higher = slower cycle. Default is `4`. |
| **Cycle speed** | How fast an animation advances through its frames. |
| **Active animation** | The animation `frameDelay` applies to — set it after `changeAni` for per-state pacing. |
| **Game frame** | One execution of `draw()` — roughly 60 per second at default frame rate. |
