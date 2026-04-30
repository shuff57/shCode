**Goal:** Show the working version of `loadJSON` in `preload()` — and then demonstrate the failure mode when it moves to `setup()`.

Note: in the lesson directory on disk, a fixture file `level1.json` contains `{"name":"Level 1","enemyCount":5}`. The live blocks below use an inline JSON literal so each step is fully self-contained in the browser runner; the walkthrough text references the real file path.

## Step 1 — The working version

`levelData` is assigned inside `preload()`. By the time `setup()` runs, the data is fully loaded and `levelData.name` is ready.

```js live
let levelData = {};

function preload() {
  // On disk this would be: levelData = loadJSON('level1.json');
  // Inline equivalent for the live block:
  levelData = JSON.parse('{"name":"Level 1","enemyCount":5}');
}

function setup() {
  new Canvas(400, 200);
  console.log(levelData.name);       // "Level 1"
  console.log(levelData.enemyCount); // 5
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Level: ' + levelData.name, 10, 30);
  text('Enemies: ' + levelData.enemyCount, 10, 55);
}
```

## Step 2 — The bug: loadJSON in setup()

Move the assignment into `setup()` instead of `preload()`. The inline simulation reflects what happens with a real async `loadJSON` call — `setup()` reads the variable before the network response arrives, so `levelData` is still `{}`.

```js live
let levelData = {};

function preload() {
  // loadJSON is NOT called here this time
}

function setup() {
  new Canvas(400, 200);
  // Bug: assignment happens after setup() already read the variable
  // levelData = loadJSON('level1.json');  ← async, data not ready yet
  console.log(levelData.name);       // undefined
  console.log(levelData.enemyCount); // undefined
}

function draw() {
  background('#445');
  fill('white');
  textSize(16);
  text('Level: ' + levelData.name, 10, 30);    // "Level: undefined"
  text('Enemies: ' + levelData.enemyCount, 10, 55); // "Enemies: undefined"
}
```

## Step 3 — Read both properties after load

Back in the working pattern: use both `levelData.name` and `levelData.enemyCount` to drive the canvas display. Notice neither value is `undefined` because `preload()` guaranteed the data arrived first.

```js live
let levelData = {};

function preload() {
  levelData = JSON.parse('{"name":"Level 1","enemyCount":5}');
}

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#222');
  fill('deepskyblue');
  textSize(18);
  text(levelData.name, 10, 40);
  fill('orange');
  textSize(14);
  text('Enemies to spawn: ' + levelData.enemyCount, 10, 70);
}
```

## Key takeaways

- `loadJSON` is asynchronous — the data arrives after the line runs, not during it.
- `preload()` is the only safe home for `loadJSON` because q5play blocks `setup()` until `preload()` is done.
- Moving `loadJSON` to `setup()` is a common mistake; the symptom is `undefined` properties everywhere.
- The fixture `level1.json` lives at `lessons/2-5-11-example-load-json/level1.json` — in a real lesson the live block would call `loadJSON('level1.json')` directly.
