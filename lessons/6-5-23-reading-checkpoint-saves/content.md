## Auto-save: saving without asking

**Read before attempting `6.5.25 Worked Example — Auto-Save on Level Complete or Timer`.**

Until now, every save in your games has been player-initiated: press a key, pick a slot, confirm. That works, but it puts the burden on the player to remember to save — and nobody remembers every time.

**Auto-save** is a save that fires automatically when something important happens. The player doesn't press a button. They might not even notice it happened. But next time they load the game, their progress is right where they left off.

### Common auto-save triggers

| Trigger | Example | When it fires |
|---------|---------|---------------|
| **Level transition** | Player reaches the exit door | `gameState = 'level2'` |
| **Checkpoint reached** | Player touches a flag sprite | Player position recorded |
| **Score milestone** | Score hits every 100 points | `if (score % 100 === 0 && score > 0)` |
| **Time interval** | Every 30 seconds of gameplay | `if (frameCount % 1800 === 0)` |
| **Before unload** | Player closes the tab | `window.addEventListener('beforeunload', ...)` |

### Score milestone auto-save example

The sketch below auto-saves every 100 points. The save is invisible — no prompt, no confirmation. Watch the console to see it fire.

```js live
let score = 0;
let lastSavedAt = 0;

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#222');

  score = score + 1;

  if (score % 100 === 0 && score > 0 && score !== lastSavedAt) {
    storeItem('autoScore', score);
    lastSavedAt = score;
    console.log('Auto-saved at score:', score);
  }

  fill('white');
  textSize(18);
  text('Score: ' + score, 20, 40);
  text('Last auto-save: ' + lastSavedAt, 20, 70);
}
```

Notice: the `lastSavedAt` guard prevents re-saving on every frame after the milestone is reached. Without it, the save would fire 60 times per second while `score` sits at exactly 100.

### Don't save every frame

Auto-save is cheap — a `storeItem` call is near-instant — but doing it every frame is still wasteful. localStorage writes are synchronous and block the main thread. A few saves per minute is fine. Sixty saves per second is not.

Guard your auto-saves with a condition:
- `score % 100 === 0 && score > 0` fires once per milestone
- `frameCount % 1800 === 0` fires every 30 seconds at 60fps
- A boolean flag like `hasSaved` that resets when the condition changes

### The player doesn't need to know

Auto-save should be subtle. At most, show a small "Saving..." indicator that fades after a second. The player should feel like their progress is magically preserved — not like the game is nagging them.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Auto-save** | A save that fires automatically on a trigger (milestone, timer, transition) rather than waiting for the player to press a button. |
| **Checkpoint** | A designated point in a level where auto-save fires — reaching it records progress so the player restarts from there, not the beginning. |
| **Milestone trigger** | A condition like "score hits 100" or "level changes" that causes an auto-save. Fires once per milestone, not continuously. |
| **Guard condition** | Extra logic (like `lastSavedAt` or a boolean flag) that prevents an auto-save from firing repeatedly when the trigger condition stays true across multiple frames. |
