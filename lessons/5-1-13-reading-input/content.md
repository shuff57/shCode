## `kb.pressing(key)` — is the key held right now?

**Read before `2.1.7a Reading — Velocity`.** About 3 minutes.

By the end of this reading you should be able to answer:

- What does `kb.pressing('w')` return when the **w** key is held? When it isn't?
- About how many times per second does an `if (kb.pressing('w')) { ... }` block run while you hold the key?

Inside `draw()`, you can ask the keyboard whether a specific key is currently held.

**What you'll learn from it:**

- `kb.pressing(key)` returns `true` while the key is held and `false` the rest of the time.
- The check happens once per `draw()` call — about 60 times a second.
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

**What you'll see:** the canvas reads `w is up`. Click the canvas to focus it, then press and hold the **w** key. The text changes to `w is HELD` while you hold it, and back to `w is up` when you let go.

**Try this:** change the key name to `'space'` and rerun. Now the spacebar is what the sketch is asking about — `w` does nothing.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`kb.pressing(key)`** | Returns `true` while `key` is currently held. Called inside `draw()`. |
| **Level-triggered input** | Keeps returning `true` as long as the key stays down (vs. firing only on first press). |
| **Key name** | A string like `'w'`, `'a'`, `'space'`, `'left'`. |
