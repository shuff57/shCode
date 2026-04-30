**Goal:** Build a four-state game loop — menu → play → pause/win → menu — driven by a single `gameState` variable and a `switch` in `draw()`.

> **Heads-up — preview, not dissection.** This worked example *uses* two transition patterns (one-shot `kb.presses(...)` to start the game, and the condition `score >= 60` to auto-advance) before they get their own dedicated readings. Watch how they work here, then read `2.5.18 Reading — Input-driven transitions` and `2.5.19 Reading — Condition-driven transitions` to see each pattern broken out atomically.

## Step 1 — The state variable and the switch skeleton

Run the sketch. It renders the menu screen. `gameState` starts as `'menu'`; the `switch` routes every frame to `case 'menu'`.

```js live
let gameState = 'menu';

function draw() {
  background('#222');
  fill(255);
  textSize(20);

  switch (gameState) {
    case 'menu':
      text('Press SPACE to start', 100, 200);
      break;
  }
}
```

## Step 2 — Add the play state and a score

Hit Run. Press SPACE — the game starts. `score` increments each frame. Notice: the transition `gameState = 'play'` lives *inside* `case 'menu'` — the menu state owns the start-game logic.

```js live
let gameState = 'menu';
let score = 0;

function draw() {
  background('#222');
  fill(255);
  textSize(20);

  switch (gameState) {
    case 'menu':
      text('Press SPACE to start', 100, 200);
      if (kb.presses(' ')) gameState = 'play';
      break;

    case 'play':
      score++;
      text('Score: ' + score, 10, 30);
      text('Press P to pause', 10, 60);
      if (kb.presses('p')) gameState = 'pause';
      break;
  }
}
```

## Step 3 — Add pause and win states

Run, start the game, press P — the game pauses. Keep playing and the score auto-transitions to `'win'` at 60. Press R on the win screen to reset everything and return to menu.

```js live
let gameState = 'menu';
let score = 0;

function draw() {
  background('#222');
  fill(255);
  textSize(20);

  switch (gameState) {
    case 'menu':
      text('Press SPACE to start', 100, 200);
      if (kb.presses(' ')) gameState = 'play';
      break;

    case 'play':
      score++;
      text('Score: ' + score, 10, 30);
      text('Press P to pause', 10, 60);
      if (score >= 60) gameState = 'win';
      if (kb.presses('p')) gameState = 'pause';
      break;

    case 'pause':
      text('PAUSED — press P to continue', 90, 200);
      if (kb.presses('p')) gameState = 'play';
      break;

    case 'win':
      text('YOU WIN — press R to restart', 80, 200);
      if (kb.presses('r')) { score = 0; gameState = 'menu'; }
      break;
  }
}
```

## Key takeaways

- One `gameState` variable drives the entire loop — no conflicting boolean flags.
- Each `case` owns the render + input + transition logic for exactly one state.
- Transitions (`gameState = '...'`) live inside the `case` that initiates them.
- Input-driven transitions use `kb.presses` (one-shot) not `kb.pressing` (held) to avoid flipping every frame.
- Condition-driven transitions (`score >= 60`) also live inside the `case` that owns them.
