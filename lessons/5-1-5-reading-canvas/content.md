## Canvas: new Canvas(w, h)

Read before `5.1.6 Reading: Sprite`. About 5 minutes.

By the end of this reading you should be able to answer:

- What two numbers go inside `new Canvas(...)`?
- Where is `(0, 0)` on the canvas: top-left, bottom-left, or centre?
- If `y = 0` is the top edge, what does a larger `y` value mean?

Every moSHion sketch needs a canvas: the rectangular drawing area where sprites appear. You create one with `new Canvas(width, height)` on the first line of `setup()`.

**What you'll learn from it:**

- `new Canvas(w, h)` sets the width and height of the drawing area in pixels.
- `(0, 0)` is the **top-left** corner of the canvas.
- `x` increases to the right, and `y` increases **downward**: the opposite of a math graph.
- A sprite at `y = 300` sits near the bottom of a 360-pixel-tall canvas.

**Try it:**

```js live
function setup() {
  new Canvas(360, 360);
}

function draw() {
  background('#222');
}
```

**What you'll see:** a 360×360 dark-grey rectangle in the preview. Nothing else has been drawn yet: that comes in 5.1.6.

**Try this:** change `360, 360` to `800, 200` and run it. Notice the canvas becomes wide and short. Then change it back. The two numbers are always `width, height`: horizontal first, then vertical.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Canvas** | The drawing area opened by `new Canvas(w, h)`. Width and height are in pixels. |
| **`(0, 0)`** | The top-left corner of the canvas: the origin of screen coordinates. |
| **Screen coordinates** | A grid where `x` increases right and `y` increases downward (opposite of math). |
| **Pixel** | One dot on screen. A 360×360 canvas is 360 pixels wide and 360 pixels tall. |
