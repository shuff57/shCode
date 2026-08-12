**Goal:** Build a plain `switch` statement with three cases that each draw different text. Not a game yet — just getting comfortable with the syntax before adding state transitions.

## Step 1 — A switch with one case

Start small. One variable, one case, one output. Run it and confirm the switch runs inside `draw()`.

```js live
let state = 'alpha';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'alpha':
      fill('#ff79c6');
      textSize(32);
      text('Alpha', 160, 110);
      break;
  }
}
```

## Step 2 — Add beta and gamma cases

Two more cases. Same variable. Each case draws its own label in a different color. Only the matching case runs — the other two are skipped.

```js live
let state = 'alpha';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'alpha':
      fill('#ff79c6');
      textSize(32);
      text('Alpha', 160, 110);
      break;

    case 'beta':
      fill('#8be9fd');
      textSize(32);
      text('Beta', 166, 110);
      break;

    case 'gamma':
      fill('#50fa7b');
      textSize(32);
      text('Gamma', 150, 110);
      break;
  }
}
```

**Try this:** edit `let state = 'alpha'` to `'beta'` and hit Run. Then `'gamma'`. The same switch, the same structure — only the matching case runs.

## Step 3 — Keyboard switches the state

Hard-coding the state variable is fine for testing, but games change screens from the keyboard. Add `kb.presses(...)` inside each case so pressing A/B/G jumps between screens.

```js live
let state = 'alpha';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'alpha':
      fill('#ff79c6');
      textSize(32);
      text('Alpha', 160, 90);
      textSize(14);
      text('Press B for beta, G for gamma', 110, 140);
      if (kb.presses('b')) state = 'beta';
      if (kb.presses('g')) state = 'gamma';
      break;

    case 'beta':
      fill('#8be9fd');
      textSize(32);
      text('Beta', 166, 90);
      textSize(14);
      text('Press A for alpha, G for gamma', 108, 140);
      if (kb.presses('a')) state = 'alpha';
      if (kb.presses('g')) state = 'gamma';
      break;

    case 'gamma':
      fill('#50fa7b');
      textSize(32);
      text('Gamma', 150, 90);
      textSize(14);
      text('Press A for alpha, B for beta', 112, 140);
      if (kb.presses('a')) state = 'alpha';
      if (kb.presses('b')) state = 'beta';
      break;
  }
}
```

Run it. Press A, B, G. Each press changes the state variable. The next frame, `draw()` runs the switch again and dispatches to the new case.

## Step 4 — Prove it works with a counter

Add a `frameCount` display. Even though the counter updates every frame, the switch still correctly picks one case per frame — proving the dispatch pattern works at 60 fps.

```js live
let state = 'alpha';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#282a36');

  fill('#6272a4');
  textSize(12);
  text('Frame: ' + frameCount, 10, 20);

  switch (state) {
    case 'alpha':
      fill('#ff79c6');
      textSize(32);
      text('Alpha', 160, 90);
      textSize(14);
      text('Press B for beta, G for gamma', 110, 150);
      if (kb.presses('b')) state = 'beta';
      if (kb.presses('g')) state = 'gamma';
      break;

    case 'beta':
      fill('#8be9fd');
      textSize(32);
      text('Beta', 166, 90);
      textSize(14);
      text('Press A for alpha, G for gamma', 108, 150);
      if (kb.presses('a')) state = 'alpha';
      if (kb.presses('g')) state = 'gamma';
      break;

    case 'gamma':
      fill('#50fa7b');
      textSize(32);
      text('Gamma', 150, 90);
      textSize(14);
      text('Press A for alpha, B for beta', 112, 150);
      if (kb.presses('a')) state = 'alpha';
      if (kb.presses('b')) state = 'beta';
      break;
  }
}
```

## Key takeaways

- `switch(state)` checks one variable and runs the matching `case`.
- Only one case executes per frame — the variable can only hold one value.
- Adding a case is as easy as copying an existing one and changing the label and colors.
- `kb.presses(...)` inside cases is how screens transition between each other.
