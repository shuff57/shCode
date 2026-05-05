**Goal:** Build a four-state machine where every transition is keyboard-driven. Four screens: title, play, pause, gameover. Every state change comes from the player pressing a key.

## Step 1 — Set up four states

Four cases in the switch: `'title'`, `'play'`, `'pause'`, `'gameover'`. Each draws something different. No transitions yet — just verify all four screens exist.

```js live
let state = 'title';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Asteroid Dodge', 80, 80);
      textSize(16);
      text('Press ENTER to play', 115, 180);
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing — dodge the asteroids!', 40, 140);
      textSize(14);
      fill('#f8f8f2');
      text('Press P to pause | Press G for game over', 60, 250);
      break;

    case 'pause':
      fill('#ffb86c');
      textSize(30);
      text('PAUSED', 140, 140);
      textSize(14);
      fill('#f8f8f2');
      text('Press P to resume', 135, 200);
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 120);
      textSize(16);
      fill('#f8f8f2');
      text('Press R to restart', 115, 200);
      break;
  }
}
```

## Step 2 — Add input checks inside each state

Each transition check lives in the `case` whose state owns it. Title → play when Enter is pressed. Play → gameover when G is pressed. Gameover → title when R is pressed.

```js live
let state = 'title';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Asteroid Dodge', 80, 80);
      textSize(16);
      text('Press ENTER to play', 115, 180);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing — dodge the asteroids!', 40, 140);
      textSize(14);
      fill('#f8f8f2');
      text('Press P to pause | Press G for game over', 60, 250);
      if (kb.presses('p')) state = 'pause';
      if (kb.presses('g')) state = 'gameover';
      break;

    case 'pause':
      fill('#ffb86c');
      textSize(30);
      text('PAUSED', 140, 140);
      textSize(14);
      fill('#f8f8f2');
      text('Press P to resume', 135, 200);
      if (kb.presses('p')) state = 'play';
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 120);
      textSize(16);
      fill('#f8f8f2');
      text('Press R to restart', 115, 200);
      if (kb.presses('r')) state = 'title';
      break;
  }
}
```

Each key press moves the game to a new state. P toggles between play and pause. G triggers game over. R sends you back to the title. All keyboard-driven.

## Step 3 — Add Escape to quit from any gameplay state

Escape should always take you back to the title. Add the same `if (kb.presses('Escape')) state = 'title'` to `case 'play'`, `case 'pause'`, and `case 'gameover'`.

```js live
let state = 'title';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Asteroid Dodge', 80, 80);
      textSize(16);
      text('Press ENTER to play', 115, 180);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing — dodge the asteroids!', 40, 130);
      textSize(14);
      fill('#f8f8f2');
      text('P to pause | G for game over | Esc to quit', 55, 250);
      if (kb.presses('p')) state = 'pause';
      if (kb.presses('g')) state = 'gameover';
      if (kb.presses('Escape')) state = 'title';
      break;

    case 'pause':
      fill('#ffb86c');
      textSize(30);
      text('PAUSED', 140, 140);
      textSize(14);
      fill('#f8f8f2');
      text('Press P to resume | Press Esc to quit', 85, 200);
      if (kb.presses('p')) state = 'play';
      if (kb.presses('Escape')) state = 'title';
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 120);
      textSize(16);
      fill('#f8f8f2');
      text('R to restart | Esc for title', 100, 200);
      if (kb.presses('r')) state = 'title';
      if (kb.presses('Escape')) state = 'title';
      break;
  }
}
```

Run it. Navigate: Enter → play, P → pause, P again → resume, Esc → quit from anywhere, G → gameover, R → restart. Every path is keyboard-controlled.

## Step 4 — Why kb.presses matters

Switch one transition from `kb.presses` to `kb.pressing` and watch what happens. The state flickers because every frame (60 per second) while the key is held, the transition fires again. `kb.presses` is the frame-safe tool for state changes.

```js live
let state = 'title';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  // Show a debug indicator when a key is held
  let pressingIndicator = kb.pressing('Enter') ? ' [HOLD]' : '';

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Asteroid Dodge', 80, 80);
      textSize(16);
      text('Press ENTER to play' + pressingIndicator, 110, 180);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing!', 140, 100);
      textSize(14);
      fill('#f8f8f2');
      text('P to pause | Esc to quit', 100, 200);
      textSize(11);
      fill('#6272a4');
      text('Hint: try holding Enter on the title screen', 75, 270);
      if (kb.presses('p')) state = 'pause';
      if (kb.presses('Escape')) state = 'title';
      break;

    case 'pause':
      fill('#ffb86c');
      textSize(30);
      text('PAUSED', 140, 140);
      textSize(14);
      fill('#f8f8f2');
      text('Press P to resume', 120, 200);
      if (kb.presses('p')) state = 'play';
      break;
  }
}
```

Hold Enter on the title screen. The `[HOLD]` indicator appears because `kb.pressing` is true, but the state only changes once — because the transition uses `kb.presses`, not `kb.pressing`.

## Key takeaways

- Input checks for transitions go inside the `case` that owns the transition — title-to-play logic lives in `case 'title'`.
- Use `kb.presses` for state transitions, not `kb.pressing`. Presses fires once; pressing fires every frame.
- Escape-to-quit is just an input-driven transition applied in multiple cases.
- P toggling between play and pause is the same pattern twice: `case 'play'` has `if (kb.presses('p')) state = 'pause'` and `case 'pause'` has the reverse.
- Keyboard-driven transitions are the simplest kind — the player is explicitly in control.
