## Single-Frame Still Art

**Read before attempting `2.4.5 Animated Sprites Sandbox`.**

**What you'll learn from it:**

- `sprite.image = '/path/to/file.png'` displays a single still image on a sprite — no `addAni` call, no animation cycle.
- Use `sprite.image` for HUD elements, level decorations, and props that never animate.
- The image fits the sprite's `w × h` — a small sprite scales the image down, a large one scales it up.
- `sprite.image` and `addAni` are mutually exclusive on a given sprite — use one or the other, not both.

**Try it:**

A single static `star` sprite using `sprite.image` with the shplay `star.webp` asset. There's no `addAni`, no frame cycle — just one image rendered every frame.

```js live
let star;

function setup() {
  new Canvas(400, 200);
  star = new Sprite(200, 100, 80, 80);
  star.collider = 'none';
  // Single still image — no animation system involved.
  star.image = '/shplay/assets/star.webp';
}

function draw() {
  background('#222');
}
```

Hit Run — the star just sits there. That's the entire API.

**Going further.** `sprite.image` accepts any URL — your own art, a `.png`, `.webp`, or `.avif`. To swap to a different still mid-game, reassign:

```js
if (collected) star.image = '/art/star_collected.png';
```

But note: this **replaces** the image, it doesn't transition or animate between them. For a smooth multi-frame effect (e.g., a blinking power-up), reach for `addAni` from `2.4.3a`.

**`sprite.image` vs `addAni` — when to use which:**

| Use | When |
|-----|------|
| `sprite.image = url` | Decorations, HUD icons, ground tiles, props that don't need to animate. |
| `sprite.addAni(...)` | Anything that cycles through frames (idle breathing, run cycle, explosion). |

A single sprite can swap *between* these strategies at runtime, but it can only display one mode at a time.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`sprite.image`** | Assigns a single still image to a sprite. No animation cycle. |
| **Still art** | A single image rendered with `sprite.image` — never advances frames. |
| **Mutually exclusive** | Using `sprite.image` and `addAni` on the same sprite at the same time is not supported. |
| **Image fitting** | The image stretches/scales to the sprite's `w × h` — set the sprite's size to match the asset's aspect ratio. |
