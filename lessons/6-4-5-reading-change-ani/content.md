## Swapping the Active Animation

**Read before attempting `6.4.8 Worked Example: Animating a Sprite`.**

**What you'll learn from it:**

- `sprite.changeAni(name)` swaps which registered animation renders on the next frame.
- You must call `addAni` for every name **before** calling `changeAni`: switching to an unregistered name is a silent no-op.
- The swap is instant; there is no blending or transition between animations.
- Driving `changeAni` from input state (`kb.pressing(...)`) is the canonical pattern for state-driven animation.

**Try it:**

This try-it registers two animations on a ghost sprite: `'idle'` (7 frames, hovers in place) and `'fly'` (4 frames, moves through the air). Holding `A` or `D` swaps the active animation to `'fly'` and pushes the ghost left or right; releasing returns it to `'idle'`.

```js live
let ghost;

function setup() {
  new Canvas(400, 200);
  ghost = new Sprite(200, 100, 80, 80);
  ghost.collider = 'none';

  // Register two named animations from separate sprite sheets.
  // Because 'idle' is the FIRST addAni call, it becomes the active animation.
  ghost.addAni('idle', '/moshion/assets/ghost_idle.avif', 7);
  ghost.addAni('fly',  '/moshion/assets/ghost_fly.avif',  4);
}

function draw() {
  background('#222');

  // changeAni(name) swaps the active animation. It only works for names
  // registered via addAni: unknown names silently no-op.
  if (kb.pressing('a') || kb.pressing('d')) {
    ghost.changeAni('fly');
    ghost.vel.x = kb.pressing('d') ? 2: -2;
    ghost.scale.x = kb.pressing('d') ? 1: -1;   // mirror when flying left
  } else {
    ghost.changeAni('idle');
    ghost.vel.x = 0;
  }
}
```

Hold `A` or `D`: the ghost flips to its flying animation and drifts in that direction. Release: instant swap back to the idle hover. The same `changeAni` mechanism powers every state-driven game character: idle/run/jump in a platformer, walk/attack in an RPG, charge/release in a puzzle game.

**One subtle thing.** Try calling `ghost.changeAni('teleport')` somewhere: nothing happens, no error. Switching to an animation you never registered is a silent no-op, so a typo'd name leaves the previous animation playing. Always confirm `addAni(name, ...)` matches your `changeAni(name)` calls exactly.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`changeAni(name)`** | Swaps the active animation to the named one (must already be registered with `addAni`). |
| **Active animation** | The animation currently rendering on a sprite, only one at a time. |
| **Silent no-op** | Calling `changeAni` with an unregistered name does nothing and throws no error. |
| **State-driven animation** | Swapping animations in response to game state: input, collision, score. |
