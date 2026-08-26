**Goal:** Control three completely different screens: red, green, blue, with one `state` variable and a `switch`. Prove that one variable is all you need.

## Step 1: One state, one screen

`state` starts as `'red'`. The switch matches `case 'red'` and draws a red background. One variable, one screen.

```js live
let state = 'red';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  switch (state) {
    case 'red':
      background('#ff5555');
      fill('#f8f8f2');
      textSize(32);
      text('Red Screen', 120, 160);
      break;
  }
}
```

## Step 2: Add green and blue cases

Two more cases. Same variable. Each case draws its own background, color, and message.

```js live
let state = 'red';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  switch (state) {
    case 'red':
      background('#ff5555');
      fill('#f8f8f2');
      textSize(32);
      text('Red Screen', 120, 160);
      break;

    case 'green':
      background('#50fa7b');
      fill('#282a36');
      textSize(32);
      text('Green Screen', 110, 160);
      break;

    case 'blue':
      background('#8be9fd');
      fill('#282a36');
      textSize(32);
      text('Blue Screen', 115, 160);
      break;
  }
}
```

Edit `let state = 'red'` to `'green'` or `'blue'` and hit Run. The state variable picks the screen.

## Step 3: Keyboard switches the state

Instead of editing code, use the keyboard. R key sets `state = 'red'`, G to green, B to blue. The transition happens inside each case.

```js live
let state = 'red';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  switch (state) {
    case 'red':
      background('#ff5555');
      fill('#f8f8f2');
      textSize(32);
      text('Red Screen', 120, 130);
      textSize(16);
      text('Press G or B to switch', 115, 170);
      if (kb.presses('g')) state = 'green';
      if (kb.presses('b')) state = 'blue';
      break;

    case 'green':
      background('#50fa7b');
      fill('#282a36');
      textSize(32);
      text('Green Screen', 110, 130);
      textSize(16);
      text('Press R or B to switch', 115, 170);
      if (kb.presses('r')) state = 'red';
      if (kb.presses('b')) state = 'blue';
      break;

    case 'blue':
      background('#8be9fd');
      fill('#282a36');
      textSize(32);
      text('Blue Screen', 115, 130);
      textSize(16);
      text('Press R or G to switch', 115, 170);
      if (kb.presses('r')) state = 'red';
      if (kb.presses('g')) state = 'green';
      break;
  }
}
```

## Step 4: Add a fourth screen in seconds

A yellow screen: one new case, one transition from each existing case. That's it. Compare that to adding a fourth boolean flag and updating a dozen if/else branches.

```js live
let state = 'red';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  switch (state) {
    case 'red':
      background('#ff5555');
      fill('#f8f8f2');
      textSize(32);
      text('Red Screen', 120, 100);
      textSize(14);
      text('Press G, B, or Y to switch', 105, 170);
      if (kb.presses('g')) state = 'green';
      if (kb.presses('b')) state = 'blue';
      if (kb.presses('y')) state = 'yellow';
      break;

    case 'green':
      background('#50fa7b');
      fill('#282a36');
      textSize(32);
      text('Green Screen', 110, 100);
      textSize(14);
      text('Press R, B, or Y to switch', 105, 170);
      if (kb.presses('r')) state = 'red';
      if (kb.presses('b')) state = 'blue';
      if (kb.presses('y')) state = 'yellow';
      break;

    case 'blue':
      background('#8be9fd');
      fill('#282a36');
      textSize(32);
      text('Blue Screen', 115, 100);
      textSize(14);
      text('Press R, G, or Y to switch', 105, 170);
      if (kb.presses('r')) state = 'red';
      if (kb.presses('g')) state = 'green';
      if (kb.presses('y')) state = 'yellow';
      break;

    case 'yellow':
      background('#f1fa8c');
      fill('#282a36');
      textSize(32);
      text('Yellow Screen', 105, 100);
      textSize(14);
      text('Press R, G, or B to switch', 105, 170);
      if (kb.presses('r')) state = 'red';
      if (kb.presses('g')) state = 'green';
      if (kb.presses('b')) state = 'blue';
      break;
  }
}
```

## Key takeaways

- One `state` variable controls everything: one place to look, one thing to change.
- Adding a screen is easy: add a `case`, add transitions from the other cases.
- Strings like `'red'`, `'green'`, `'blue'` are more readable than numbers like `0`, `1`, `2`.
- The alternative: a tangle of `if/else if/else if`: gets harder to read with every screen you add.
