## Game value → state change

Read after `6.6.15 Reading: moSHion docs: Input-Driven Transitions`. About 8 minutes.

**What you'll learn from it:**

- A **condition-driven transition** happens automatically: something in the game (score, health, timer, position) triggers it. The player doesn't press anything.
- The pattern: inside the relevant `case` in `draw()`, check `if (score >= 100) state = 'win'`.
- These transitions run every frame, so the condition is rechecked continuously. Once triggered, the new state takes over next frame.
- Common condition-driven transitions: play → gameover (death), play → win (score/goal), play → levelComplete (position reached).

**Try it:**

```js live
let state = 'title';
let score, health;

function setup() {
  new Canvas(400, 250);
  score = 0;
  health = 60;
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Survival', 130, 80);
      textSize(16);
      text('Press ENTER to start', 115, 180);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      score++;
      health--;
      fill('#50fa7b');
      textSize(18);
      text('Score: ' + score, 10, 30);
      fill('#ff5555');
      text('Health: ' + health, 10, 55);

      if (score >= 120) state = 'win';
      if (health <= 0) state = 'gameover';
      break;

    case 'win':
      fill('#ffb86c');
      textSize(36);
      text('YOU WIN!', 120, 80);
      fill('#f8f8f2');
      textSize(18);
      text('Final Score: ' + score, 130, 180);
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 100);
      fill('#f8f8f2');
      textSize(18);
      text('Final Score: ' + score, 125, 180);
      break;
  }
}
```

Press Enter. Two conditions run every frame: `score >= 120` triggers `'win'`, `health <= 0` triggers `'gameover'`. Whichever fires first wins. The player never presses a key to end the game: the game decides.

---

## Both transition types coexist

Most games use both types. A play state might have:

```
// Input-driven (player controls)
if (kb.presses('p'))      state = 'pause';

// Condition-driven (game decides)
if (health <= 0)          state = 'gameover';
if (score >= target)      state = 'win';
```

Same switch, same draw loop. The difference is **who triggers the change**.

---

## Short glossary (quick reference)

| Term | Meaning |
|---|---|
| **Condition-driven transition** | A state change triggered by a game value (score, health, timer, position) rather than player input. |
| **Game-over trigger** | A boolean expression (e.g. `health <= 0`) that moves the game to `'gameover'` when true. |
| **Win condition** | A boolean expression (e.g. `score >= 100`) that moves the game to `'win'` when true. |
| **Frame check** | A condition tested every frame inside a `case`: fires automatically when the condition is met. |
