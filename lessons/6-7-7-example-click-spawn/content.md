**Goal:** Combine mouse position (2.7.3) and one-shot click detection (2.7.5) to spawn exactly one sprite per click.

## Step 1 — Hit Run and click

Click anywhere on the canvas. A new sprite appears at your cursor. Click again — another one. Each click makes exactly one sprite, not a stream.

```js live
function setup() { new Canvas(400, 400); }

function draw() {
  background('#222');
  if (mouse.presses()) {
    new Sprite(mouse.x, mouse.y, 20, 20);
  }
}
```

## Step 2 — Why one sprite per click

`mouse.presses()` returns `true` on exactly one frame — the frame the button first goes down. After that frame it returns `false` again, even while the button stays held. That single-frame window is what limits us to one sprite per click.

Swap `mouse.presses()` for `mouse.pressing()` and hold the mouse button down. Sprites pour out in a stream — one per frame. Then swap back. Now you see why `presses()` is the right pick here.

```js live
function setup() { new Canvas(400, 400); }

function draw() {
  background('#222');
  // Try: change mouse.presses() to mouse.pressing() and hold the button
  if (mouse.presses()) {
    new Sprite(mouse.x, mouse.y, 20, 20);
  }
}
```

## Key takeaways

- `mouse.presses()` fires on exactly one frame per click — the first frame the button is down.
- `mouse.pressing()` is true on every frame the button is held — right tool for movement, wrong tool for spawning.
- `mouse.x` / `mouse.y` give the cursor position in canvas coordinates, ready to use as sprite position.
- Create sprites inside `draw()` only when you mean to create them; one sprite per click requires the single-shot gate.
