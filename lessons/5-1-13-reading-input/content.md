## `kb.pressing(key)`: is the key held right now?

**Read before `5.1.14 Reading: Key names: WASD and the arrow keys`.** About 5 minutes.

By the end of this reading you should be able to answer:

- What does `kb.pressing('w')` return when the **w** key is held? When it isn't?
- About how many times per second does an `if (kb.pressing('w')) { ... }` block run while you hold the key?

Inside `draw()`, you can ask the keyboard whether a specific key is currently held.

**What you'll learn from it:**

- `kb.pressing(key)` returns `true` while the key is held and `false` the rest of the time.
- The check happens once per `draw()` call, about 60 times a second.
- Common key names: `'w'`, `'a'`, `'s'`, `'d'`, `'space'`, `'left'`, `'right'`, `'up'`, `'down'`.

**Try it:**

```js live
function setup() {
  new Canvas(360, 160);
}

function draw() {
  background('#222');
  fill('white');
  textSize(20);
  if (kb.pressing('w')) {
    text('w is HELD', 20, 90);
  } else {
    text('w is up', 20, 90);
  }
}
```

**Reading the `if`:** it is the same `if / else` as in Chapter 2. `if (condition) { ... }` runs its block when the condition is `true`, and the `else { ... }` block runs when it is `false`. Here the condition is `kb.pressing('w')`.

**What you'll see:** the canvas reads `w is up`. Click the canvas to focus it, then press and hold the **w** key. The text changes to `w is HELD` while you hold it, and back to `w is up` when you let go.

**Try this:** change the key name to `'space'` and rerun. Now the spacebar is what the sketch is asking about: `w` does nothing.

**One more: `kb.presses(key)`.** `kb.pressing` is `true` on every frame the key is down. `kb.presses` is `true` on only **one** frame: the frame the key goes down. Use it when one tap should do one thing, like change a color once.

```js live
let taps = 0;
let heldFrames = 0;

function setup() {
  new Canvas(360, 160);
}

function draw() {
  background('#222');
  if (kb.presses('w')) {
    taps = taps + 1;
  }
  if (kb.pressing('w')) {
    heldFrames = heldFrames + 1;
  }
  fill('white');
  textSize(20);
  text('presses: ' + taps, 20, 60);
  text('pressing frames: ' + heldFrames, 20, 110);
}
```

**What you'll see:** click the canvas, hold **w** for about a second, then let go. `presses` goes up by 1. `pressing frames` goes up by about 60, one for every frame you held the key.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`kb.pressing(key)`** | Returns `true` while `key` is currently held. Called inside `draw()`. |
| **Level-triggered input** | Keeps returning `true` as long as the key stays down (vs. firing only on first press). |
| **`kb.presses(key)`** | Returns `true` only on the frame the key goes down: one tap, one `true`. |
| **Key name** | A string like `'w'`, `'a'`, `'space'`, `'left'`. |
