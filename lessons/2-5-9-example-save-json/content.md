**Goal:** Show that `save(obj, 'name.json')` triggers a browser download of an in-memory object as a JSON file.

## Step 1 — Hit Run and press E

You'll see a dark canvas with text. Press `E` — a file download named `level1.json` appears in your browser's download bar.

```js live
let level = {
  name: "Level 1",
  platforms: [
    { x: 100, y: 300, w: 200, h: 20 },
    { x: 400, y: 250, w: 100, h: 20 }
  ],
  enemyCount: 5,
  startPos: { x: 50, y: 100 }
};

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Press E to export level', 10, 30);
  if (kb.presses('e')) save(level, 'level1.json');
}
```

## Step 2 — Open the downloaded file

Open the downloaded `level1.json` in any text editor. You'll see something like the snippet below — a plain JSON document, indentation-formatted by the browser:

```json
{
  "name": "Level 1",
  "platforms": [
    { "x": 100, "y": 300, "w": 200, "h": 20 },
    { "x": 400, "y": 250, "w": 100, "h": 20 }
  ],
  "enemyCount": 5,
  "startPos": { "x": 50, "y": 100 }
}
```

Notice:

- The array of platforms is preserved exactly — `save()` internally calls `JSON.stringify`.
- Nested objects (like `startPos`) are indented and fully intact.
- Nothing is lost because every value (numbers, strings, arrays) is JSON-serializable.

## Step 3 — Add a property and re-export

Add `bossHealth: 100` to the `level` object, press E again, and compare the two downloaded files side by side.

```js live
let level = {
  name: "Level 1",
  bossHealth: 100,
  platforms: [
    { x: 100, y: 300, w: 200, h: 20 },
    { x: 400, y: 250, w: 100, h: 20 }
  ],
  enemyCount: 5,
  startPos: { x: 50, y: 100 }
};

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Press E to export level', 10, 30);
  if (kb.presses('e')) save(level, 'level1.json');
}
```

## Key takeaways

- `save(obj, 'filename.json')` downloads the object as a JSON file — one line, no setup required.
- Internally it calls `JSON.stringify`, so the same serialization rules apply (functions and `undefined` are dropped).
- Use this when you want players or level designers to save data to disk rather than to localStorage.
- The file can be loaded back later with `loadJSON('level1.json')` inside `preload()` (see 2.5.11).
