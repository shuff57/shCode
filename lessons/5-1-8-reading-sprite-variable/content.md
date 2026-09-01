## Storing the sprite in a let variable

Read before `5.1.9 Reading: background(color) wipe rule`. About 5 minutes.

By the end of this reading you should be able to answer:

- Where should the `let` declaration for a sprite go, and where should the assignment go?
- What goes wrong if you call `new Sprite(...)` inside `draw()` instead of `setup()`?
- Why do you need to name the sprite at all?

Once a sprite exists you'll want to move it, recolor it, or read its position. To do any of that, you need a **name**: a variable that holds a reference to the sprite object.

**What you'll learn from it:**

- Declare the variable (`let player;`) at the **top of the file**, outside both functions.
- Assign the sprite (`player = new Sprite(...)`) inside `setup()`, which runs exactly once.
- If you call `new Sprite(...)` inside `draw()`, you create a brand-new sprite **every frame**: 60 per second, and they pile up invisibly.
- A file-scope `let` is visible inside both `setup()` and `draw()`, so you can reference the same sprite in both places.

**Try it:**

The first sketch puts `new Sprite(...)` inside `draw()`. Watch what the engine reports after a few seconds.

```js live
function setup() {
  new Canvas(360, 200);
}

function draw() {
  background('#222');
  new Sprite(180, 100, 40, 40); // new sprite every frame: pile-up!
}
```

**What you'll see:** the canvas looks fine at first, but the engine creates a new sprite on every frame. Switch to this corrected version:

```js live
let player;

function setup() {
  new Canvas(360, 200);
  player = new Sprite(180, 100, 40, 40); // created once, in setup
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
  // player still exists: same one, every frame
}
```

**What you'll see:** one stable blue square. The `player` variable gives you a handle to the same sprite for as long as the sketch runs.

**Try this:** add `player.color = 'tomato';` inside `draw()` and run it. The square turns red, because `player` in `draw()` still refers to the same object you created in `setup()`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **File-scope variable** | A `let` declared outside any function. Visible inside both `setup()` and `draw()`. |
| **Declaration** | `let player;`: reserves the name; value is `undefined` until assigned. |
| **Assignment** | `player = new Sprite(...)`: stores the sprite object in the variable. |
| **Sprite pile-up** | What happens when `new Sprite(...)` runs inside `draw()`: 60 new sprites per second accumulate. |
