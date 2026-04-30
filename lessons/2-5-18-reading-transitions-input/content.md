## Press → state change

Read before `2.5.19 Reading — Condition-driven transitions`. About 5 minutes.

**What you'll learn from it:**

- The simplest transition is `if (kb.presses('space')) gameState = 'play';` placed inside the relevant `case`.
- Use `kb.presses` (one-shot — true on the first frame the key is pressed) instead of `kb.pressing` (held — true every frame the key is down) so the state doesn't flip every frame while the key is held.
- Transitions belong inside the `case` whose state owns them — the menu-to-play transition is logic for `case 'menu'`, not global.
- The **return-to-menu** transition (e.g. `kb.presses('r')` on the win screen → `gameState = 'menu'`) is just an input-driven transition pointing the other direction. Same pattern, same `case`-ownership rule — used in `2.5.20 A16.2 Game States` to close the loop.

**Try it:**

```js live
let gameState = 'menu';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  switch (gameState) {
    case 'menu':
      background('#222');
      fill(255);
      textSize(18);
      text('MENU — press Space to play', 60, 110);
      if (kb.presses(' ')) gameState = 'play';
      break;

    case 'play':
      background('#234');
      fill('#0f0');
      textSize(18);
      text('PLAY — press Escape to go back', 50, 110);
      if (kb.presses('Escape')) gameState = 'menu';
      break;
  }
}
```

Press Space to go to play. Press Escape to return. Try holding Space — notice the state only flips once, not every frame, because `kb.presses` is one-shot.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Transition** | A line that assigns a new value to `gameState` — moves the game to a different state next frame. |
| **One-shot input** | `kb.presses(key)` — true only on the single frame the key is first pressed down. |
| **Held input** | `kb.pressing(key)` — true every frame the key is held; wrong for transitions. |
| **Input-driven transition** | A state change triggered by the player pressing a key. |
