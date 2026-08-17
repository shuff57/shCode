## Drawing a HUD on Top of the World

**Read before attempting `6.4.18 Side-Scrolling Platformer`.**

**What you'll learn from it:**

- `sprite.layer = N` controls draw order — higher numbers render on top of lower numbers.
- The default layer is `0`; use `100` (or any high number) for HUD or overlay sprites.
- Layer order is independent of the order sprites were created in `setup()`.
- The camera transform still applies to all layers — a sprite at `layer = 100` scrolls with the world unless you compensate for camera position.

**Try it:**

```js live
let player, hud;

function setup() {
  new Canvas(400, 300);
  for (let x = 0; x <= 1500; x += 100) {
    let dot = new Sprite(x, 150, 20, 20, 'static');
    dot.color = '#88ff00';
  }
  player = new Sprite(100, 150, 30, 30);
  player.color = 'tomato';

  // HUD sprite — high layer so it always draws on top.
  hud = new Sprite(340, 30, 40, 40, 'static');
  hud.color = 'gold';
  hud.layer = 100;
}

function draw() {
  background('#222');
  camera.x = player.pos.x;

  // Keep the HUD at a fixed screen position by offsetting with camera.x.
  hud.pos.x = camera.x + 140;

  if (kb.pressing('d')) player.vel.x = 4;
  else if (kb.pressing('a')) player.vel.x = -4;
  else player.vel.x = 0;
}
```

Walk right with **D**. The gold HUD square stays in the top-right of the view and renders on top of the green dots, regardless of world position.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`sprite.layer`** | Draw order property — higher numbers render on top. Default is `0`. |
| **Layer** | A numeric z-index for sprites; controls which sprite appears in front. |
| **HUD** | Heads-Up Display — UI elements that overlay the game world (health, score, etc.). |
| **Camera offset** | Adding `camera.x` to a sprite's position each frame to keep it fixed on screen. |
