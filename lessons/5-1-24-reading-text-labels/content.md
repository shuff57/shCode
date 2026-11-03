## Words on the canvas: text()

Read before `5.1.23 Sprite Playground`. About 5 minutes.

By the end of this reading you should be able to answer:

- What three things does `text()` need, and in what order?
- What do `fill()` and `textSize()` change?
- Why must the `text()` line come **after** `background()` inside `draw()`?

You have already seen words on the canvas twice: the frame counter in 5.1.3 and the `w is HELD` sketch in 5.1.13. A sketch often needs words like that: a title, a score, a label. moSHion draws them with `text()`, and this reading explains how it works.

**What you'll learn from it:**

- `text('Hello', x, y)` draws the words inside the quotes. `x` is where the words **start** (their left end), and `y` is the line the letters sit on. Like everything on the canvas, `y` gets bigger as you go **down**.
- The words go inside quotes, the same way a color name does.
- `fill(color)` sets the color the words are drawn in. It takes the same kind of color string as `.color`, such as `'white'` or `'tomato'`. Call it **before** `text()`.
- `textSize(n)` sets how tall the letters are, in pixels. Call it **before** `text()`.
- `draw()` paints in the order the lines are written. `background()` paints the whole canvas, so if it comes after `text()` it covers the words and you see nothing.

**Try it:**

```js live
function setup() {
  new Canvas(360, 160);
}

function draw() {
  background('#222');
  fill('white');
  textSize(24);
  text('Hello, canvas!', 20, 60);
}
```

**What you'll see:** the words `Hello, canvas!` in white, near the upper left of a dark canvas.

**Try this:**

1. Change `20` to `150` and rerun. The words start further to the right.
2. Change `60` to `120` and rerun. The words move down.
3. Change `24` to `40` and rerun. The letters get bigger.
4. Change `'white'` to `'gold'` and rerun. The words change color.
5. Last one: cut the `background('#222');` line and paste it **below** the `text(...)` line. Rerun. The words disappear, because the background now paints over them. Put it back at the top.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`text(words, x, y)`** | Draws `words` on the canvas. `x` is where the words start; `y` is the line they sit on. |
| **`fill(color)`** | Sets the color used for the words drawn after it. |
| **`textSize(n)`** | Sets the height of the letters, in pixels, for the words drawn after it. |
| **Draw order** | Lines in `draw()` paint top to bottom, so later lines appear on top of earlier ones. |
