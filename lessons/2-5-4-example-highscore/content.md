**Goal:** Combine read-with-coercion and conditional write into a working high-score display that survives page reloads.

## Step 1 — Read the saved high score on startup

In `setup()`, we read whatever was previously stored under `'highScore'`. Because `getItem` always returns a string (or `null` if nothing was stored yet), we wrap it in `Number(...)`. If the result is falsy (`NaN` or `0`), the `|| 0` fallback gives us a safe starting value.

Hit Run — you'll see `Score: 0` and `Best: 0` on a dark canvas.

```js live
let score, highScore;

function setup() {
  new Canvas(400, 400);
  score = 0;
  highScore = Number(getItem('highScore')) || 0;
}

function draw() {
  background('#222');
  text(`Score: ${score}`, 10, 20);
  text(`Best:  ${highScore}`, 10, 40);
}
```

## Step 2 — Increment the score each frame

Add `score++` inside `draw()` so the score climbs automatically. Watch both numbers — only the score is changing. The high score is still frozen at whatever was saved last run (or `0` on first run).

```js live
let score, highScore;

function setup() {
  new Canvas(400, 400);
  score = 0;
  highScore = Number(getItem('highScore')) || 0;
}

function draw() {
  background('#222');
  score++;
  text(`Score: ${score}`, 10, 20);
  text(`Best:  ${highScore}`, 10, 40);
}
```

## Step 3 — Write to storage when score beats the record

Add the conditional write: if the current score exceeds the saved high score, update both the in-memory `highScore` variable and the stored value. Run until `Best` updates, then reload — the high score stays at the last peak.

```js live
let score, highScore;

function setup() {
  new Canvas(400, 400);
  score = 0;
  highScore = Number(getItem('highScore')) || 0;
}

function draw() {
  background('#222');
  score++;
  text(`Score: ${score}`, 10, 20);
  text(`Best:  ${highScore}`, 10, 40);

  if (score > highScore) {
    highScore = score;
    storeItem('highScore', highScore);
  }
}
```

## Key takeaways

- Read the saved value once in `setup()`, not every frame — storage reads are slower than variable reads.
- Always coerce with `Number(...)` — `getItem` returns a string and `string > number` comparisons produce wrong results.
- `|| 0` is the idiomatic fallback when the key may not exist yet (`null` → `0`).
- Write to storage only when the value actually changes — put `storeItem` inside the `if`, not unconditionally in `draw`.
