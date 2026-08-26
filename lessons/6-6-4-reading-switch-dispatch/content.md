## switch inside draw() — the game dispatch pattern

**Read before `6.6.5 Worked Example — switch with Three Cases`.** About 5 minutes.

By the end of this reading you should be able to answer:

- Where does `switch` go in a moSHion sketch?
- How often does the switch run?
- Why is this called a "dispatch" pattern?

`draw()` runs 60 times per second. Every frame, your game needs to decide: what screen is showing right now, and what should I draw? The `switch` checks the state variable and dispatches to the right screen's code. One check, every frame, one clear path.

**What you'll learn from it:**

- `switch` goes inside `draw()`, right after `background()`.
- Each `case` draws one complete screen — its background elements, its text, its sprites.
- Keyboard checks (`kb.presses(...)`) live inside cases because different screens listen for different keys.
- This pattern is called **dispatch** — one switch distributes control to many code paths.

**Try it:**

```js live
let screen = 'menu';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  switch (screen) {
    case 'menu':
      fill('#8be9fd');
      textSize(28);
      text('Main Menu', 120, 140);
      textSize(16);
      text('Press G to play', 130, 180);
      if (kb.presses('g')) screen = 'game';
      break;

    case 'game':
      fill('#50fa7b');
      textSize(28);
      text('Game Running', 110, 140);
      textSize(16);
      text('Press M for menu', 125, 180);
      if (kb.presses('m')) screen = 'menu';
      break;
  }
}
```

**What you'll see:** the menu screen first. Press G — the game screen. Press M — back to menu. Each case owns its own look and its own keyboard controls.

Run it and press G, then M, then G again. Every frame, `draw()` checks `screen` and dispatches to the right case. This is the core pattern behind every state machine in this module.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Dispatch** | Using `switch` to route execution to the right code path based on a variable's value. |
| **draw() loop** | moSHion calls `draw()` 60 times per second. The switch runs on every call. |
| **Case ownership** | Each case is responsible for its own drawing AND its own input handling. |
