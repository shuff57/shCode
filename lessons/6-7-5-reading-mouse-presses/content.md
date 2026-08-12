## One frame, one click

**Read after `2.7.4 Reading — shplay docs: mouse.pressing()`.** About 5 minutes.

`mouse.presses()` returns `true` on exactly one frame — the frame the button first goes down. The very next frame it returns `false`, even if you are still holding. That makes it a one-shot signal.

This is the mouse equivalent of `kb.presses(key)`, which you have used for keyboard events.

**What you'll learn from it:**

- `mouse.presses()` is `true` on the single frame the button transitions from up to down.
- It is `false` on every other frame, including all the frames where you are still holding.
- One click always produces exactly one `true` — no matter how long you hold.
- Use `mouse.presses()` when you want "one action per click," not "action while held."

**Try it:** run the sketch and click the canvas once. One sprite appears. Click again — one more. Now hold the button down — still only one sprite per press, no stream.

Compare this to the `mouse.pressing()` sketch from the previous reading: same spawn code, different function, completely different result.

```js live
function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  if (mouse.presses()) {
    new Sprite(mouse.x, mouse.y, 20, 20);
  }
}
```

**What you'll see:** one sprite per click, no matter how long you hold. The background clears each frame, but sprites persist because shplay keeps them in the world until deleted.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`mouse.presses()`** | Returns `true` on the single frame the mouse button first goes down. `false` every other frame. |
| **One-shot input** | An input event that fires exactly once per button press, regardless of how long the button is held. |
