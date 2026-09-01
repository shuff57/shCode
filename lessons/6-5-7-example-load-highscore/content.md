**Goal:** Build a score-chasing game that loads the saved high score on startup, displays it next to the current score, and updates it when the player beats the record.

## Step 1: Load the saved high score on startup

In `setup()`, read whatever was stored under `'highScore'`. Wrap it in `Number()` and use `|| 0` as the fallback for the first run. Hit Run: you will see `Score: 0` and `Best: 0`.

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

## Step 2: Increment the score each frame

Add `score++` in `draw()`. The current score climbs while `Best:` stays frozen at whatever was saved last session. This is the key distinction: `score` lives in a variable (RAM, lost on reload), `highScore` was loaded from the save slot (disk, survives reload).

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

## Step 3: Update and save when the player beats the record

Add the conditional: when `score` passes `highScore`, update both the variable and the save slot. `storeItem` is inside the `if`: it only writes when there is actually a new record.

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

## Step 4: Reload to verify persistence

Let the score climb past `0` so `Best:` updates. Then reload the page. The canvas resets: `Score:` is back at `0`, but `Best:` shows the value saved from your last run.

That is persistence: the variable `score` was destroyed on reload, but the save slot kept `highScore` safe.

## Key takeaways

- **Read once in `setup()`**: storage reads are slower than variable reads, so load the value at startup and keep it in a variable.
- **Always coerce with `Number()`**: `getItem` returns a string, and uncoerced string comparisons produce wrong results (see 6.5.6).
- **`|| 0` is the first-run fallback**: when no save data exists yet, `Number(null)` is `0`, and `|| 0` gives you a clean start.
- **Write only when the value changes**: `storeItem` belongs inside the `if`, not in `draw()` unconditionally. Writes to storage are expensive.
