## background(color) wipe rule

Read before `5.1.10 Reading: Sprite property tour`. About 5 minutes.

By the end of this reading you should be able to answer:

- Why must `background(color)` be the **first** line inside `draw()`?
- What do you see on screen when `background()` is missing and the sprite is moving?
- What kind of string does `background()` accept?

`draw()` runs about 60 times every second. Each run paints new things on top of what was already there. Without a wipe at the start of each frame, every position the sprite ever occupied stays visible: it smears.

**What you'll learn from it:**

- `background(color)` fills the whole canvas with a solid color, erasing everything from the previous frame.
- It must be the **very first call** inside `draw()` so nothing from last frame bleeds through.
- The color argument is any CSS color string: `'#222'`, `'black'`, `'navy'`, `'#ff8800'`, etc.
- When motion exists and `background()` is missing, you see a trail of every frame the sprite was ever drawn at.

**Try it:**

This sketch shifts the sprite right by one pixel each frame so the trail effect is visible. The motion line (`player.pos.x = player.pos.x + 1`) uses a sprite property you'll meet properly in **5.1.10**, for now, just observe what happens with and without `background()`.

```js live
let player;

function setup() {
  new Canvas(360, 200);
  player = new Sprite(10, 100, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  // background('#222');  ← try uncommenting this line
  player.pos.x = player.pos.x + 1;
}
```

**What you'll see:** a smear of blue squares across the canvas: every frame the sprite visited is still painted there, because nothing wiped the previous frame.

**Try this:** uncomment the `background('#222')` line and rerun. The trail disappears and the sprite slides cleanly across a dark background. The wipe happens *every* frame, *before* anything else paints: that's why `background()` belongs at the top of `draw()`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`background(color)`** | Fills the entire canvas with `color`, clearing everything drawn in the previous frame. |
| **Wipe** | The act of clearing the canvas at the start of each frame. `background()` is what does the wipe. |
| **Frame trail** | The smear left when `background()` is missing and a moving sprite is drawn over old frames. |
| **CSS color string** | A color value like `'#222'`, `'black'`, or `'tomato'`: the same format used in HTML/CSS. |
