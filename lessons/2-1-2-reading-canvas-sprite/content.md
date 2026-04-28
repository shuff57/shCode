# Canvas & Sprite

Read this before `2.1.5 Hello Sprite`. About 5 minutes.

By the end of this reading you should be able to look at a q5play sketch and answer:

- What does `setup()` do? What does `draw()` do?
- What numbers go inside `new Canvas(...)`?
- What do the four numbers inside `new Sprite(...)` mean?
- Why is `background('#222')` the first line inside `draw()`?

---

## `setup()` and `draw()` are functions q5play calls for you

You don't call `setup()` or `draw()` yourself. You **define** them, and the engine calls them on a schedule:

- `setup()` runs **once**, the moment the sketch starts.
- `draw()` runs **every frame** — about 60 times per second, forever.

Think of `setup()` as "build the world" and `draw()` as "what happens this frame."

---

## `new Canvas(width, height)` makes the drawing area

Every sketch needs a canvas. Make it on the first line of `setup()`:

```js
new Canvas(360, 360);   // 360 pixels wide, 360 pixels tall
```

**What you'll see when you run it:** a 360×360 black rectangle in the preview pane. That's your canvas. Nothing else has been drawn yet, so it's empty.

---

## `new Sprite(x, y, width, height)` makes a rectangle the engine draws for you

A **sprite** is a visible, physics-aware rectangle. Its four numbers are:

```js
new Sprite(180, 180, 60, 60);
//          ^    ^   ^   ^
//          x    y   w   h     ← centre x, centre y, width, height
```

You don't call a `render()` or `drawSprite()`. Once you create it, q5play draws it every frame automatically.

**Heads up — y goes DOWN, not up.** The top-left of the canvas is `(0, 0)`. `y = 360` is the *bottom* edge, not the top. This is the opposite of a math graph and trips up almost every beginner the first time they try to make something fall.

---

## Store the sprite in a variable so you can change it later

If you put `new Sprite(...)` directly inside `draw()`, you make a brand-new sprite *every frame* — sixty per second. The old ones pile up, and you have no name to grab the sprite by later when you want to move it.

The fix: declare a variable at the top of the file, assign the sprite once in `setup()`, and use that variable forever after.

```js live
let player;                              // declare — empty for now

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 60, 60); // assign once, in setup
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');                    // clear the canvas first
}
```

**What you'll see:** a 60×60 light-blue square sitting in the middle of a dark-grey canvas.

**Try this:** change `'deepskyblue'` to `'tomato'` and run it. Then change the `180, 180` inside `new Sprite(...)` to `50, 50` and run again — notice the sprite jumps to the *top-left* corner, because `y = 50` is near the top.

---

## `background(color)` must be the first line of `draw()`

`draw()` runs 60 times a second. If you don't clear the canvas at the start of each frame, the previous frame's drawings stay behind and pile up. `background('#222')` paints the whole canvas dark grey, wiping last frame clean.

The string `'#222'` is a hex colour (a short way of writing `'#222222'`, a dark grey). You can also write `'black'`, `'white'`, `'navy'`, `'#ff8800'`, etc.

**Try this:** delete the `background('#222')` line and run the sketch. It looks fine — because the sprite isn't moving yet. *Next* reading, when you add motion, try the same delete again. You'll see a smear of every frame the sprite was ever drawn at. That's why `background()` goes first.

---

## A `Sprite` has properties you can read and change

After `player = new Sprite(...)`, the sprite is an object with values you can read or set with `=`:

| Property | What it means | Example |
|----------|---------------|---------|
| `player.color`     | The fill colour. | `player.color = 'tomato'` |
| `player.pos.x`, `player.pos.y` | The current position. | `console.log(player.pos.x)` |
| `player.vel.x`, `player.vel.y` | The current velocity. (Next reading.) | `player.vel.x = 4` |
| `player.rotation`  | Rotation in degrees. | `player.rotation = 45` |
| `player.layer`     | Which sprite is drawn on top. Higher layer = on top. | `player.layer = 2` |

**Try this:** add `player.rotation = 30;` at the bottom of `setup()` and run it. The square is now tilted.

---

## Quick reference

| Term | Meaning |
|------|---------|
| **Canvas** | The drawing area, made by `new Canvas(w, h)`. |
| **Sprite** | A rectangle q5play draws for you each frame. |
| **Frame** | One run of `draw()`. q5play does ~60 of them per second. |
| **`setup()`** | Function you define. Engine calls it once at start. |
| **`draw()`** | Function you define. Engine calls it every frame. |
| **`background(color)`** | Paints the whole canvas in `color`. Must be first inside `draw()`. |

---

Once you can answer the four questions at the top, open `2.1.5 Hello Sprite` and start coding.
