## One variable owns the screen

What screen is the player on right now? The title screen? The game itself? A game over screen?

The answer lives in one variable. That variable is the single source of truth — one place to check, zero confusion.

Use a string: `'title'`, `'play'`, `'gameover'`. Strings are readable. When you see `case 'play':` you know exactly what screen that is.

**The pattern:**

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
      textSize(32);
      text('My Game', 130, 140);
      textSize(16);
      text('Press ENTER to start', 110, 180);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing...', 140, 150);
      if (kb.presses('g')) state = 'gameover';
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(32);
      text('Game Over', 110, 140);
      textSize(16);
      text('Press R to restart', 115, 180);
      if (kb.presses('r')) state = 'title';
      break;
  }
}
```

Run it. Press Enter, then G, then R. The state variable changes; `draw()` re-checks it; the screen changes.

---

## The alternative is messy

Without a state variable, people scatter boolean flags everywhere:

```js
let isTitleScreen = true;
let isPlaying = false;
let isGameOver = false;
```

What happens when `isTitleScreen` and `isPlaying` are both `true`? Nothing good. Booleans invite impossible combinations. One state variable makes impossible combinations impossible: the variable can only hold one value at a time.

---

## Short glossary

| Term | Meaning |
|------|---------|
| **State variable** | A `let` whose value says what the game is doing right now — `'title'`, `'play'`, `'gameover'`. |
| **Single source of truth** | One place in the code owns a piece of information. Nothing else can contradict it. |
| **String state** | Using a readable string like `'play'` instead of a number like `1` for the state value. |
