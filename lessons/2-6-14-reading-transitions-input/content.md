## Player presses a key → state changes

Read before `2.6.16 Reading — Condition-Driven Transitions`. About 8 minutes.

**What you'll learn from it:**

- An **input-driven transition** happens when the player presses a key. The player is in control of when the state changes.
- The pattern: inside the relevant `case` in `draw()`, check `if (kb.presses('key')) state = 'newState'`.
- Use `kb.presses` (true on the first frame only) so the transition fires exactly once. `kb.pressing` would fire every frame the key is held, causing the state to flicker.
- The transition belongs inside the `case` whose state owns the logic — title-to-play transition lives in `case 'title'`, not somewhere global.
- Common input-driven transitions: title → play (Enter), play → pause (P), any state → quit (Escape).

**Try it:**

```js live
let state = 'title';

function setup() {
  new Canvas(400, 250);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('My Game', 120, 80);
      textSize(16);
      text('Press ENTER to play', 115, 180);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing!', 140, 100);
      textSize(14);
      text('Press Escape to quit', 115, 140);
      if (kb.presses('Escape')) state = 'title';
      break;
  }
}
```

Press Enter to start playing. Press Escape to go back to the title. Try holding Enter — notice the state changes just once, not every frame, because `kb.presses` is one-shot.

---

## Input-driven vs. condition-driven

Input-driven transitions are the ones the **player** triggers. Tomorrow you'll learn about **condition-driven** transitions, where the game itself decides — score thresholds, health reaching zero, timers expiring. The key difference:

| Transition type | Who decides | Example |
|---|---|---|
| Input-driven | Player | Press P → pause |
| Condition-driven | Game state | Health ≤ 0 → gameover |

Both follow the same rule: put the check inside the `case` that owns it.

---

## Short glossary (quick reference)

| Term | Meaning |
|---|---|
| **Input-driven transition** | A state change triggered by the player pressing a key — `kb.presses(key)` inside a `case`. |
| **One-shot input** | `kb.presses(key)` — true only on the single frame the key is first pressed. Use for transitions. |
| **Held input** | `kb.pressing(key)` — true every frame the key is down. Use for movement, not transitions. |
| **Key binding** | The specific key assigned to trigger a transition (e.g. P for pause, Escape for quit). |
