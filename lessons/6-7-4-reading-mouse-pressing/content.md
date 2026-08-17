## A button held down

**Read before `6.7.5 Reading — shplay docs: mouse.presses()`.** About 5 minutes.

`mouse.pressing()` returns `true` every frame the mouse button is being held down. As long as your finger stays on the button, it stays `true`. The moment you release, it goes `false`.

This mirrors how `kb.pressing(key)` works for the keyboard — you already know that pattern.

**What you'll learn from it:**

- `mouse.pressing()` is `true` on every frame the button is held, not just the first one.
- It returns `false` the frame after you release.
- Because `draw()` runs ~60 times per second, code inside `if (mouse.pressing())` runs ~60 times per second while the button is held.

**Try it:** run the sketch and hold the mouse button down over the canvas. New sprites spawn as long as you hold. Release and they stop. Hold again — more appear.

```js live
function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  if (mouse.pressing()) {
    new Sprite(mouse.x, mouse.y, 10, 10);
  }
}
```

**What you'll see:** a stream of small sprites appearing wherever the cursor is while the button is held. The stream stops the moment you release.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`mouse.pressing()`** | Returns `true` every frame the mouse button is held down. Goes `false` when released. |
| **Held input** | An input that is active continuously for as long as a button is held — as opposed to one-shot input, which fires only on the first frame. |
