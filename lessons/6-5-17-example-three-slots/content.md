**Goal:** Build three save slots. Each slot is a differently-named key. Press 1/2/3 to save, hold Shift+1/2/3 to load.

## Step 1 — Player with movement and a score

A simple player that moves with arrow keys and collects coins for points.

```js live
let player;
let coin;
let score = 0;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
  coin = new Sprite(random(50, 350), random(50, 250), 12, 12);
  coin.color = '#f1fa8c';
}

function draw() {
  background('#222');

  if (kb.pressing('right'))     player.vel.x = 4;
  else if (kb.pressing('left')) player.vel.x = -4;
  else                          player.vel.x = 0;

  if (kb.pressing('down'))      player.vel.y = 4;
  else if (kb.pressing('up'))   player.vel.y = -4;
  else                          player.vel.y = 0;

  if (player.overlaps(coin)) {
    score = score + 1;
    coin.position.x = random(50, 350);
    coin.position.y = random(50, 250);
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
}
```

## Step 2 — Save to three slots

When you press 1, 2, or 3, build a save object with position and score, then `storeItem` to a slot key.

```js live
let player;
let coin;
let score = 0;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
  coin = new Sprite(random(50, 350), random(50, 250), 12, 12);
  coin.color = '#f1fa8c';
}

function draw() {
  background('#222');

  if (kb.pressing('right'))     player.vel.x = 4;
  else if (kb.pressing('left')) player.vel.x = -4;
  else                          player.vel.x = 0;

  if (kb.pressing('down'))      player.vel.y = 4;
  else if (kb.pressing('up'))   player.vel.y = -4;
  else                          player.vel.y = 0;

  if (player.overlaps(coin)) {
    score = score + 1;
    coin.position.x = random(50, 350);
    coin.position.y = random(50, 250);
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);

  // Save to slots
  if (kb.presses('1')) {
    let saveData = { x: player.x, y: player.y, score: score };
    storeItem('saveSlot1', JSON.stringify(saveData));
  }
  if (kb.presses('2')) {
    let saveData = { x: player.x, y: player.y, score: score };
    storeItem('saveSlot2', JSON.stringify(saveData));
  }
  if (kb.presses('3')) {
    let saveData = { x: player.x, y: player.y, score: score };
    storeItem('saveSlot3', JSON.stringify(saveData));
  }

  fill('#8be9fd');
  textSize(12);
  text('Press 1/2/3 to save | Shift+1/2/3 to load', 10, 50);
}
```

## Step 3 — Show which slots have saves

Before drawing the HUD, check each slot with `getItem`. If it returns something (not null), that slot is occupied.

```js live
let player;
let coin;
let score = 0;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
  coin = new Sprite(random(50, 350), random(50, 250), 12, 12);
  coin.color = '#f1fa8c';
}

function draw() {
  background('#222');

  if (kb.pressing('right'))     player.vel.x = 4;
  else if (kb.pressing('left')) player.vel.x = -4;
  else                          player.vel.x = 0;

  if (kb.pressing('down'))      player.vel.y = 4;
  else if (kb.pressing('up'))   player.vel.y = -4;
  else                          player.vel.y = 0;

  if (player.overlaps(coin)) {
    score = score + 1;
    coin.position.x = random(50, 350);
    coin.position.y = random(50, 250);
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);

  // Save to slots
  if (kb.presses('1')) {
    storeItem('saveSlot1', JSON.stringify({ x: player.x, y: player.y, score: score }));
  }
  if (kb.presses('2')) {
    storeItem('saveSlot2', JSON.stringify({ x: player.x, y: player.y, score: score }));
  }
  if (kb.presses('3')) {
    storeItem('saveSlot3', JSON.stringify({ x: player.x, y: player.y, score: score }));
  }

  // Show slot status
  textSize(12);
  let s1 = getItem('saveSlot1') !== null ? 'SAVED' : 'empty';
  let s2 = getItem('saveSlot2') !== null ? 'SAVED' : 'empty';
  let s3 = getItem('saveSlot3') !== null ? 'SAVED' : 'empty';
  fill('#ffb86c');
  text('Slot 1 [1]: ' + s1, 10, 65);
  text('Slot 2 [2]: ' + s2, 10, 80);
  text('Slot 3 [3]: ' + s3, 10, 95);

  fill('#8be9fd');
  text('Press 1/2/3 to save | Shift+1/2/3 to load', 10, 120);
}
```

Try it: press 1 to save. The slot label changes from "empty" to "SAVED".

## Step 4 — Load from a slot

Hold Shift and press 1, 2, or 3 to load. Parse the JSON and restore position and score.

```js live
let player;
let coin;
let score = 0;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
  coin = new Sprite(random(50, 350), random(50, 250), 12, 12);
  coin.color = '#f1fa8c';
}

function draw() {
  background('#222');

  if (kb.pressing('right'))     player.vel.x = 4;
  else if (kb.pressing('left')) player.vel.x = -4;
  else                          player.vel.x = 0;

  if (kb.pressing('down'))      player.vel.y = 4;
  else if (kb.pressing('up'))   player.vel.y = -4;
  else                          player.vel.y = 0;

  if (player.overlaps(coin)) {
    score = score + 1;
    coin.position.x = random(50, 350);
    coin.position.y = random(50, 250);
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);

  // Save to slots
  if (kb.presses('1')) {
    storeItem('saveSlot1', JSON.stringify({ x: player.x, y: player.y, score: score }));
  }
  if (kb.presses('2')) {
    storeItem('saveSlot2', JSON.stringify({ x: player.x, y: player.y, score: score }));
  }
  if (kb.presses('3')) {
    storeItem('saveSlot3', JSON.stringify({ x: player.x, y: player.y, score: score }));
  }

  // Load from slots (hold Shift)
  if (kb.pressing('shift')) {
    if (kb.presses('1')) loadSlot('saveSlot1');
    if (kb.presses('2')) loadSlot('saveSlot2');
    if (kb.presses('3')) loadSlot('saveSlot3');
  }

  // Show slot status
  textSize(12);
  let s1 = getItem('saveSlot1') !== null ? 'SAVED' : 'empty';
  let s2 = getItem('saveSlot2') !== null ? 'SAVED' : 'empty';
  let s3 = getItem('saveSlot3') !== null ? 'SAVED' : 'empty';
  fill('#ffb86c');
  text('Slot 1 [1]: ' + s1, 10, 65);
  text('Slot 2 [2]: ' + s2, 10, 80);
  text('Slot 3 [3]: ' + s3, 10, 95);

  fill('#8be9fd');
  text('Press 1/2/3 to save | Shift+1/2/3 to load', 10, 120);
}

function loadSlot(key) {
  let raw = getItem(key);
  if (raw !== null) {
    let data = JSON.parse(raw);
    player.x = data.x;
    player.y = data.y;
    score = data.score;
  }
}
```

Save in slot 1, move somewhere else, then hold Shift+1 to restore your saved position and score.

## Key takeaways

- A **save slot** is just a different key name — `'saveSlot1'`, `'saveSlot2'`, `'saveSlot3'` are three separate entries in localStorage.
- **Save** = build an object with the data you care about, `JSON.stringify` it, call `storeItem`.
- **Load** = call `getItem(key)`, check it isn't null, `JSON.parse` it, apply the values.
- **Check before loading** — `getItem` returns `null` for empty slots. Always guard with `if (raw !== null)`.
