## removeItem and clearStorage

You already know `storeItem` (write) and `getItem` (read). Now you need the other two operations: delete one save, or delete every save.

**What you'll learn:**

- `removeItem('keyName')` removes exactly one save: every other save is untouched.
- `clearStorage()` removes **every** save, from every game on this site. Your saved pictures, sounds and fonts are kept.
- Pick the right tool for the job: surgical delete vs. full reset.

---

### removeItem: delete one key

Run the block below. It stores three items, prints a before count, removes one, then prints the after count.

```js live
let countBefore = 0;
let countAfter = 0;

function setup() {
  new Canvas(400, 200);

  storeItem('itemA', 'hello');
  storeItem('itemB', 'world');
  storeItem('itemC', '!!');

  // Count items before removal
  if (getItem('itemA') !== null) countBefore = countBefore + 1;
  if (getItem('itemB') !== null) countBefore = countBefore + 1;
  if (getItem('itemC') !== null) countBefore = countBefore + 1;

  removeItem('itemB');

  // Count after: itemB is gone
  if (getItem('itemA') !== null) countAfter = countAfter + 1;
  if (getItem('itemB') !== null) countAfter = countAfter + 1;
  if (getItem('itemC') !== null) countAfter = countAfter + 1;
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Keys before removeItem: ' + countBefore, 10, 40);
  text('Keys after  removeItem: ' + countAfter, 10, 70);
}
```

After `removeItem('itemB')`, `getItem('itemB')` returns `null`: it no longer exists. `itemA` and `itemC` are unaffected.

---

### clearStorage: erase every save

WARNING: `clearStorage()` removes every save made with `storeItem`, and not just this game's: all your sketches share one store, so another game's high score goes too. There is no undo. Your saved pictures, sounds and fonts are kept. Use it in a settings menu with a confirmation prompt, never as a default action; to reset one game, `removeItem` its own names instead.

```js live
let beforeClear = '';
let afterClear = '';

function setup() {
  new Canvas(400, 200);

  storeItem('highScore', '42');
  storeItem('playerName', 'Ada');
  storeItem('volume', '0.8');

  beforeClear = 'highScore: ' + getItem('highScore') + ', playerName: ' + getItem('playerName');

  clearStorage();

  afterClear = 'highScore: ' + getItem('highScore') + ', playerName: ' + getItem('playerName');
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('Before clearStorage: ' + beforeClear, 10, 40);
  text('After  clearStorage: ' + afterClear, 10, 70);
  fill('#ff5555');
  textSize(11);
  text('(all values are now null)', 10, 100);
}
```

---

### removeItem vs. clearStorage

| `removeItem(key)` | `clearStorage()` |
|---|---|
| Removes **one** save | Removes **every** save, in every game |
| Other saves stay intact | Only saved pictures, sounds and fonts survive |
| Use for: deleting one save slot | Use for: factory-reset settings |
| Safe: you control what goes | Dangerous: no undo, confirm first |

---

## Glossary

| Term | Meaning |
|---|---|
| **removeItem(key)** | Deletes one save. After this, `getItem(key)` returns `null`. |
| **clearStorage()** | Removes every save, from every game on this site (saved pictures, sounds and fonts are kept). Irreversible: confirm before calling. |
| **null** | The value `getItem` returns when the key doesn't exist (or was deleted). |
