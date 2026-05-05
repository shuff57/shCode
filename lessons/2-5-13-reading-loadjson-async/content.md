## loadJSON — loading external game data

**Read before the next video.** About 5 minutes.

By the end of this reading you should be able to answer:

- What is `loadJSON` for, and how is it different from `storeItem`/`getItem`?
- Why does `loadJSON` need a callback instead of a return value?
- What kind of things do you load with it?

You have two patterns now. They look similar but serve different purposes:

| | `storeItem` / `getItem` | `loadJSON` |
|---|---|---|
| **For** | Player saves, progress | Game assets: levels, maps, dialogue |
| **Where data lives** | localStorage in the browser | An external file on disk/URL |
| **Who writes it** | Your game at runtime | You, the developer, before runtime |
| **When** | On demand (keypress, checkpoint) | Usually at startup |

**What you'll learn from it:**

- `loadJSON(path, callback)` fetches a JSON file and passes the result to a callback function.
- It runs **asynchronously** — it starts the fetch, keeps going, and calls your function later when the data arrives.
- You use `loadJSON` for things you want to hard-code ahead of time: level layouts, NPC dialogue trees, item catalogs, quiz questions.

**Try it:**

```js live
let levelData = null;

function setup() {
  new Canvas(400, 250);

  loadJSON('data/levels.json', function(data) {
    levelData = data;
    console.log('Level data loaded:', data);
  });

  console.log('This line runs BEFORE the data arrives.');
}

function draw() {
  background('#222');

  if (levelData) {
    fill('lime');
    textSize(18);
    text('Level: ' + levelData.name, 20, 60);
    fill('white');
    textSize(14);
    text('Starting lives: ' + levelData.startingLives, 20, 85);
    text('Enemy count: ' + levelData.enemies.length, 20, 105);
  } else {
    fill('#ffaa00');
    textSize(16);
    text('Loading level data...', 20, 90);
  }
}
```

**What you'll see:** "Loading level data..." flashes on screen briefly, then (once the fetch completes) the level name and stats appear. The `console.log` after `loadJSON` proves the callback fires later.

**The callback rule:** you cannot write `let data = loadJSON('file.json')` and use the return value. `loadJSON` doesn't return the data — it passes it to your callback. This is the async pattern.

**What `loadJSON` is good for in your games:**
- Level layouts (tile maps, platform positions)
- Enemy spawn data (type, x, y, timing)
- Dialogue trees (character lines, choices, responses)
- Item catalogs (names, stats, descriptions)
- Quiz question banks (questions, answers, distractors)

These are things you design ahead of time as a developer. They're not player saves — they're the blueprint your game runs from.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Async** | Short for "asynchronous." Code that starts now but finishes later — it doesn't block. |
| **Callback** | A function you pass into another function, to be called when work is done. `loadJSON` uses this pattern. |
| **`loadJSON(path, callback)`** | q5play function that fetches a JSON file and passes the parsed object to your callback. |
