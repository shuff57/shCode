## Why it must live in `preload()`

Read before `2.5.11 Worked Example — Load JSON in preload`.

**What you'll learn from it:**

- `loadJSON(url)` fetches a JSON file over the network — the result is not ready the moment the line runs.
- q5play's `preload()` function runs *before* `setup()` and blocks until every `loadJSON` call inside it finishes.
- Calling `loadJSON` from `setup()` instead returns an empty object that gets filled in later — any code that reads it inline sees `{}` and breaks.
- The fix is always the same: move `loadJSON` into `preload()`.

**Try it (concept demo only — the live `loadJSON` bug fires at `2.5.11`):**

The block below shows where `loadJSON` *would* live in a real project. Because the in-app live runner can't fetch a relative-path JSON fixture, the demo simulates `loadJSON` with an inline `JSON.parse(...)` so you can see the `preload`-runs-before-`setup` ordering. **The actual async failure mode** — moving the call into `setup()` and watching `levelData.name` come back `undefined` — lives at `2.5.11 Worked Example — Load JSON in preload`, where a real `level1.json` fixture is shipped next to the lesson and `loadJSON` is called for real.

```js live
let levelData = {};

function preload() {
  // In a real project: levelData = loadJSON('level1.json');
  // Simulating the result here so the live block works standalone:
  levelData = JSON.parse('{"name":"Level 1","enemyCount":5}');
}

function setup() {
  new Canvas(400, 200);
  console.log(levelData.name);      // "Level 1" — ready because preload ran first
  console.log(levelData.enemyCount); // 5
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Level: ' + levelData.name, 10, 30);
}
```

To **see the actual async bug fire** with a real network fetch, jump to `2.5.11 Worked Example — Load JSON in preload`. Moving the synchronous simulated `JSON.parse` from `preload` into `setup` won't reproduce the failure — you need the real async `loadJSON` for that.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Async** | Code whose result isn't ready immediately — it finishes some time after the line runs. |
| **`preload()`** | The q5play function that runs before `setup()` and blocks until all its `loadJSON` calls resolve. |
| **`loadJSON(url)`** | Fetches a JSON file from a URL asynchronously; must be called from `preload()`. |
| **Empty object `{}`** | What `loadJSON` returns immediately if called from `setup()` before the fetch completes. |
