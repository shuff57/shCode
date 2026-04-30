## Game outcome → state change

Read before `2.5.20 A16.2 Game States`. About 5 minutes.

**What you'll learn from it:**

- Transitions don't have to come from input — `if (score >= 10) gameState = 'win';` or `if (lives === 0) gameState = 'lose';` are equally valid.
- The rule is the same as input-driven: the transition lives inside the `case` that owns it.
- Be careful not to flip every frame: once `score >= 10`, the next frame is *also* `>= 10`. Guard the transition or rely on the new `case` not testing the same condition.
- A **guard** is a condition or structure that prevents a transition from firing more than once.

**Try it:**

```js live
let gameState = 'menu';
let score = 0;

function setup() {
  new Canvas(400, 200);
}

function draw() {
  switch (gameState) {
    case 'menu':
      background('#222');
      fill(255);
      textSize(18);
      text('Press Space to start', 80, 110);
      if (kb.presses(' ')) gameState = 'play';
      break;

    case 'play':
      background('#234');
      score++;
      fill('#0f0');
      textSize(18);
      text('Score: ' + score, 10, 30);
      text('(auto-advances at 60)', 10, 60);
      if (score >= 60) gameState = 'win';
      break;

    case 'win':
      background('#040');
      fill('#ff0');
      textSize(22);
      text('YOU WIN! Press R to restart', 50, 110);
      if (kb.presses('r')) { score = 0; gameState = 'menu'; }
      break;
  }
}
```

Press Space. After about one second (60 frames) the condition `score >= 60` fires and the game moves to `'win'`. The `'win'` case doesn't retest `score`, so the transition fires exactly once.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Condition-driven transition** | A state change triggered by a game value (score, lives, timer) rather than player input. |
| **Win condition** | A boolean expression that, when true, transitions the game to `'win'` or `'lose'`. |
| **Guard** | An extra condition or structural choice that prevents a transition from re-firing every frame. |
| **Frame logic** | The work one `case` does for a single frame — can include both checks and transitions. |
