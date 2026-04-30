## State dispatch — switch(gameState) in draw()

Read before `2.5.17 Worked Example — Three-state machine`. About 5 minutes.

**What you'll learn from it:**

- Putting `switch (gameState)` at the top of `draw()` turns each `case` into "the frame logic for this state."
- Only one case runs per frame, so render and input handling for each state lives in its own block.
- Transitions (assigning a new value to `gameState`) inside a `case` don't take effect until the *next* frame — predictable, no mid-frame surprises.
- This is called **state dispatch** — one central switch routes every frame to the right behavior.

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
      textSize(20);
      text('MENU — edit gameState to "play" and reload', 20, 110);
      break;
    case 'play':
      background('#234');
      fill('#0f0');
      textSize(20);
      text('PLAY — edit gameState to "menu" and reload', 20, 110);
      break;
  }
}
```

Edit `gameState` to `'play'` and hit Run. Watch the background color and message flip. Only one `case` runs per frame.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **State dispatch** | Using a single `switch` to route each frame to the code for the current state. |
| **Frame logic** | The work `draw()` does for one frame while the game is in a specific state. |
| **Transition** | A line that assigns a new value to `gameState` — moves the game to another state next frame. |
| **Per-state block** | The code inside one `case` — render + input + transition logic for exactly one state. |
