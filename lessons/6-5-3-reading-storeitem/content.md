## Saving a value that survives reload

**Read before attempting `6.5.4 Worked Example — Save a High Score on Game Over`.**

Your game runs, the player earns a score, and then they close the tab. Everything in your variables is gone — wiped from RAM. If you want the score to still be there tomorrow, you need to **save it**.

`storeItem(key, value)` writes a piece of game data into the browser's save slot. Pick a name for the key (like `'highScore'`), give it a value, and that value sticks around even after the page reloads.

**Try it:** run the sketch. The canvas shows the saved score. Now reload the page — `42` is still there. Next, change the `42` to `99` and run again — the display updates. The save slot remembers whatever you wrote last, even across page reloads.

```js live
let savedScore;

function setup() {
  new Canvas(400, 200);
  storeItem('lastScore', 42);
  savedScore = getItem('lastScore');
}

function draw() {
  background('#222');
  text(`Saved score: ${savedScore}`, 10, 20);
  text('Reload the page — the score is still here.', 10, 50);
}
```

---

## When to save

You do not need to save every frame. Save once when something meaningful happens — the player beats a record, finishes a level, or changes a setting. Putting `storeItem` inside an `if` is the standard pattern:

```js
if (score > highScore) {
  storeItem('highScore', score);
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Save slot** | A named place in the browser's storage where your game keeps one value. Each key is a separate slot. |
| **Persistence** | Data that survives a page reload or tab close. |
| **`storeItem(key, value)`** | moSHion function — writes `value` into the save slot named `key`. |
| **key** | The string name you pick for a save slot — e.g. `'highScore'`, `'playerName'`, `'level'`. |
