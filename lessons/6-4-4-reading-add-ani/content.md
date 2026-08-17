## Registering a Named Animation

**Read before attempting `2.4.3b Reading — changeAni(name)`.**

**What you'll learn from it:**

- `sprite.addAni(name, spriteSheetUrl, frameCount)` registers a named animation by slicing a sprite-sheet image into `frameCount` frames horizontally.
- The frames cycle automatically — shplay advances through them every game frame and loops.
- The **first** `addAni` call also becomes the sprite's active animation automatically — register your default state first.
- A sprite with a registered animation renders the animation each frame instead of the default colored rectangle.

**Try it:**

This try-it uses a real sprite sheet — `asterisk_explode.avif`, 11 frames in a single image. `addAni('explode', url, 11)` slices it horizontally into 11 frames and registers them under the name `'explode'`.

```js live
let splat;

function setup() {
  new Canvas(400, 200);
  splat = new Sprite(200, 100, 100, 100);
  splat.collider = 'none';

  // Register a named animation from a sprite sheet.
  // Args: (name, sheetUrl, frameCount).
  // Because this is the FIRST addAni call on this sprite,
  // shplay also sets it as the active animation automatically.
  splat.addAni('explode', '/shplay/assets/asterisk_explode.avif', 11);
}

function draw() {
  background('#222');
}
```

Hit Run — the asterisk plays its 11-frame explosion cycle automatically. Two things to notice:

1. The default colored rectangle is gone — the registered animation replaces it as soon as the sheet loads.
2. You never had to call `changeAni` to start the animation — the **first** `addAni` activates automatically. The next reading covers `changeAni` for the moment when you want to swap to a *different* registered animation.

**Sprite-sheet anatomy.** The image at `/shplay/assets/asterisk_explode.avif` is one wide PNG-style file containing 11 frames in a row. shplay divides the sheet's width by `frameCount` to compute each frame's slice size. If you have multiple animations packed into a multi-row sheet, use `addAnis` (plural) with an atlas object — that's covered in `6.4.9 Animated Sprites Sandbox`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`addAni(name, sheetUrl, frameCount)`** | Registers a named animation by slicing a horizontal sprite sheet into `frameCount` frames. First call also sets the active animation. |
| **Sprite sheet** | A single image containing multiple animation frames laid out in a grid (typically a single row for `addAni`). |
| **Active animation** | The one animation currently rendering on a sprite — only one at a time. |
| **Frame (animation)** | One slice of the sprite sheet; shplay advances through them automatically. |
