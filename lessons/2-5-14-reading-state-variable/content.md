## One variable owns the flow

Read before `2.5.15 Reading — The switch statement`. About 5 minutes.

**What you'll learn from it:**

- A state variable is a regular `let` whose value is a short string label — `'menu'`, `'play'`, `'win'`.
- Naming it `gameState` is convention; the name isn't magic.
- The rule: one variable holds the current state, and only that variable decides what `draw()` does each frame.
- This beats sprinkled booleans (`isPlaying`, `isPaused`, `isWon`) because impossible combinations like `isPlaying && isPaused` become unrepresentable.

**Try it:**

```js live
let gameState = 'menu';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#222');
  fill(255);
  textSize(24);
  text('Current state: ' + gameState, 20, 110);
}
```

Edit `let gameState = 'menu'` to `'play'` or `'win'` and hit Run. The log updates each time — one variable, one source of truth.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **State** | A label that describes what the game is currently doing — e.g. `'menu'`, `'play'`, `'win'`. |
| **State variable** | The single `let` whose value is the current state — conventionally named `gameState`. |
| **Single source of truth** | One place in the code that owns a piece of information; nothing else can contradict it. |
| **Boolean flag** | A `true`/`false` variable used to track a condition — fragile when you need many of them at once. |
