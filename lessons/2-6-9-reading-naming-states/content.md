## Names are documentation

State names appear in two places: the `let` that holds the current state, and every `case` in your `switch`. Good names make both places readable. Bad names make both places confusing.

## The convention

- **Lowercase.** `'title'`, not `'Title'` or `'TITLE'`.
- **One word when possible.** `'play'`, `'pause'`, `'menu'`.
- **No spaces.** Use camelCase if you need two words: `'gameOver'`, `'levelSelect'`.

## Common state names across games

Almost every game shares these states:

| State name | What it means |
|------------|---------------|
| `'title'` | The start screen — game name, instructions, "Press Enter" |
| `'play'` | The game is running — player moves, score goes up, enemies spawn |
| `'pause'` | Everything frozen — player can't move, score holds still |
| `'gameover'` | The player lost — show final score, "Press R to restart" |
| `'win'` | The player won — show congratulations, "Press R to play again" |

## Bad names vs. good names

Run this sketch. It has awful state names. Then compare with the second sketch.

```js live
let x = 's1';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  switch (x) {
    case 's1':
      fill('#f8f8f2');
      textSize(32);
      text('Screen 1', 130, 130);
      textSize(14);
      text('(What IS this screen?)', 110, 160);
      if (kb.presses('Enter')) x = 's2';
      break;

    case 's2':
      fill('#50fa7b');
      textSize(32);
      text('Screen 2', 130, 130);
      textSize(14);
      text('(What is happening?)', 110, 160);
      if (kb.presses('Escape')) x = 's3';
      break;

    case 's3':
      fill('#ff5555');
      textSize(32);
      text('Screen 3', 130, 130);
      if (kb.presses('r')) x = 's1';
      break;
  }
}
```

You have to guess what `'s1'`, `'s2'`, `'s3'` mean. Now the same machine with good names:

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
      text('My Game', 140, 130);
      textSize(14);
      text('Press ENTER to play', 125, 160);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      fill('#50fa7b');
      textSize(32);
      text('Playing...', 130, 130);
      textSize(14);
      text('Press ESC for game over', 110, 160);
      if (kb.presses('Escape')) state = 'gameover';
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(32);
      text('Game Over', 130, 130);
      textSize(14);
      text('Press R to restart', 125, 160);
      if (kb.presses('r')) state = 'title';
      break;
  }
}
```

No guessing. `case 'title':` is obviously the title screen. The names document the game flow.

---

## Course convention

For this course, use **simple lowercase strings**: `'title'`, `'play'`, `'pause'`, `'gameover'`, `'win'`.

---

## Short glossary

| Term | Meaning |
|------|---------|
| **Naming convention** | An agreed-upon rule for how to name things — lowercase strings for state values. |
| **Self-documenting code** | Code whose names are so clear you barely need comments — `case 'title'` explains itself. |
