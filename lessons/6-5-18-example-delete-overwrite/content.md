**Goal:** Extend the three-slot system with delete (removeItem), overwrite warnings, and empty-slot handling.

## Step 1: Start from the three-slot system

Same player + coin setup from 6.5.17. Save/load with 1/2/3 and Shift+1/2/3.

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

  if (kb.presses('1')) saveToSlot('saveSlot1');
  if (kb.presses('2')) saveToSlot('saveSlot2');
  if (kb.presses('3')) saveToSlot('saveSlot3');

  if (kb.pressing('shift')) {
    if (kb.presses('1')) loadSlot('saveSlot1');
    if (kb.presses('2')) loadSlot('saveSlot2');
    if (kb.presses('3')) loadSlot('saveSlot3');
  }

  drawSlotStatus();
}

function saveToSlot(key) {
  storeItem(key, JSON.stringify({ x: player.x, y: player.y, score: score }));
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

function drawSlotStatus() {
  textSize(12);
  let s1 = getItem('saveSlot1') !== null ? 'SAVED': 'empty';
  let s2 = getItem('saveSlot2') !== null ? 'SAVED': 'empty';
  let s3 = getItem('saveSlot3') !== null ? 'SAVED': 'empty';
  fill('#ffb86c');
  text('Slot 1 [1]: ' + s1, 10, 65);
  text('Slot 2 [2]: ' + s2, 10, 80);
  text('Slot 3 [3]: ' + s3, 10, 95);
  fill('#8be9fd');
  text('Press 1/2/3 to save | Shift+1/2/3 to load | X+1/2/3 to delete', 10, 120);
}
```

## Step 2: Delete a slot with removeItem

Press X then a number key (1, 2, or 3) to call `removeItem` on that slot.

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

  // Save
  if (kb.presses('1')) saveToSlot('saveSlot1');
  if (kb.presses('2')) saveToSlot('saveSlot2');
  if (kb.presses('3')) saveToSlot('saveSlot3');

  // Load
  if (kb.pressing('shift')) {
    if (kb.presses('1')) loadSlot('saveSlot1');
    if (kb.presses('2')) loadSlot('saveSlot2');
    if (kb.presses('3')) loadSlot('saveSlot3');
  }

  // Delete: hold X and press 1/2/3
  if (kb.pressing('x')) {
    if (kb.presses('1')) removeItem('saveSlot1');
    if (kb.presses('2')) removeItem('saveSlot2');
    if (kb.presses('3')) removeItem('saveSlot3');
  }

  drawSlotStatus();
}

function saveToSlot(key) {
  storeItem(key, JSON.stringify({ x: player.x, y: player.y, score: score }));
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

function drawSlotStatus() {
  textSize(12);
  let s1 = getItem('saveSlot1') !== null ? 'SAVED': 'empty';
  let s2 = getItem('saveSlot2') !== null ? 'SAVED': 'empty';
  let s3 = getItem('saveSlot3') !== null ? 'SAVED': 'empty';
  fill('#ffb86c');
  text('Slot 1 [1]: ' + s1, 10, 65);
  text('Slot 2 [2]: ' + s2, 10, 80);
  text('Slot 3 [3]: ' + s3, 10, 95);
  fill('#8be9fd');
  text('Save: 1/2/3 | Load: Shift+1/2/3 | Delete: X+1/2/3', 10, 120);
}
```

Save to a slot, then delete it with X+number. The label switches back to "empty".

## Step 3: Overwrite protection

Before saving to a slot that already has data, show a warning. Only save if the player presses the key a second time within 2 seconds.

```js live
let player;
let coin;
let score = 0;
let pendingOverwrite = null;
let pendingTime = 0;

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

  // Save with overwrite protection
  if (kb.presses('1')) trySave('saveSlot1');
  if (kb.presses('2')) trySave('saveSlot2');
  if (kb.presses('3')) trySave('saveSlot3');

  // Confirm or timeout the pending overwrite
  if (pendingOverwrite !== null && millis() - pendingTime > 2000) {
    pendingOverwrite = null;
  }

  if (kb.pressing('shift')) {
    if (kb.presses('1')) loadSlot('saveSlot1');
    if (kb.presses('2')) loadSlot('saveSlot2');
    if (kb.presses('3')) loadSlot('saveSlot3');
  }

  if (kb.pressing('x')) {
    if (kb.presses('1')) removeItem('saveSlot1');
    if (kb.presses('2')) removeItem('saveSlot2');
    if (kb.presses('3')) removeItem('saveSlot3');
  }

  drawSlotStatus();

  // Draw overwrite warning
  if (pendingOverwrite !== null) {
    fill('#ff5555');
    textSize(14);
    text('Overwrite ' + pendingOverwrite + '? Press again to confirm.', 10, 145);
  }
}

function trySave(key) {
  if (getItem(key) !== null && pendingOverwrite !== key) {
    pendingOverwrite = key;
    pendingTime = millis();
  } else if (pendingOverwrite === key) {
    storeItem(key, JSON.stringify({ x: player.x, y: player.y, score: score }));
    pendingOverwrite = null;
  } else {
    storeItem(key, JSON.stringify({ x: player.x, y: player.y, score: score }));
  }
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

function drawSlotStatus() {
  textSize(12);
  let s1 = getItem('saveSlot1') !== null ? 'SAVED': 'empty';
  let s2 = getItem('saveSlot2') !== null ? 'SAVED': 'empty';
  let s3 = getItem('saveSlot3') !== null ? 'SAVED': 'empty';
  fill('#ffb86c');
  text('Slot 1 [1]: ' + s1, 10, 65);
  text('Slot 2 [2]: ' + s2, 10, 80);
  text('Slot 3 [3]: ' + s3, 10, 95);
  fill('#8be9fd');
  text('Save: 1/2/3 | Load: Shift+1/2/3 | Delete: X+1/2/3', 10, 120);
}
```

Save to slot 1, then press 1 again. A red warning appears. Press 1 a second time to confirm the overwrite, or wait 2 seconds for it to cancel.

## Step 4: Handle empty slot loading

What happens when the player tries to load from an empty slot? Show a message instead of silently failing.

```js live
let player;
let coin;
let score = 0;
let pendingOverwrite = null;
let pendingTime = 0;
let loadMessage = '';
let loadMessageTime = 0;

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

  if (kb.presses('1')) trySave('saveSlot1');
  if (kb.presses('2')) trySave('saveSlot2');
  if (kb.presses('3')) trySave('saveSlot3');

  if (pendingOverwrite !== null && millis() - pendingTime > 2000) {
    pendingOverwrite = null;
  }

  if (kb.pressing('shift')) {
    if (kb.presses('1')) loadSlot('saveSlot1');
    if (kb.presses('2')) loadSlot('saveSlot2');
    if (kb.presses('3')) loadSlot('saveSlot3');
  }

  if (kb.pressing('x')) {
    if (kb.presses('1')) removeItem('saveSlot1');
    if (kb.presses('2')) removeItem('saveSlot2');
    if (kb.presses('3')) removeItem('saveSlot3');
  }

  drawSlotStatus();

  if (pendingOverwrite !== null) {
    fill('#ff5555');
    textSize(14);
    text('Overwrite ' + pendingOverwrite + '? Press again to confirm.', 10, 145);
  }

  // Show load feedback
  if (loadMessage !== '' && millis() - loadMessageTime < 1500) {
    fill('#f1fa8c');
    textSize(12);
    text(loadMessage, 10, 170);
  }
}

function trySave(key) {
  if (getItem(key) !== null && pendingOverwrite !== key) {
    pendingOverwrite = key;
    pendingTime = millis();
  } else if (pendingOverwrite === key) {
    storeItem(key, JSON.stringify({ x: player.x, y: player.y, score: score }));
    pendingOverwrite = null;
  } else {
    storeItem(key, JSON.stringify({ x: player.x, y: player.y, score: score }));
  }
}

function loadSlot(key) {
  let raw = getItem(key);
  if (raw !== null) {
    let data = JSON.parse(raw);
    player.x = data.x;
    player.y = data.y;
    score = data.score;
    loadMessage = 'Loaded ' + key + '!';
    loadMessageTime = millis();
  } else {
    loadMessage = 'No save in ' + key;
    loadMessageTime = millis();
  }
}

function drawSlotStatus() {
  textSize(12);
  let s1 = getItem('saveSlot1') !== null ? 'SAVED': 'empty';
  let s2 = getItem('saveSlot2') !== null ? 'SAVED': 'empty';
  let s3 = getItem('saveSlot3') !== null ? 'SAVED': 'empty';
  fill('#ffb86c');
  text('Slot 1 [1]: ' + s1, 10, 65);
  text('Slot 2 [2]: ' + s2, 10, 80);
  text('Slot 3 [3]: ' + s3, 10, 95);
  fill('#8be9fd');
  text('Save: 1/2/3 | Load: Shift+1/2/3 | Delete: X+1/2/3', 10, 120);
}
```

Try Shift+1 before saving anything: you'll see "No save in saveSlot1". Save and load to see the success message.

## Key takeaways

- **`removeItem(key)`** surgically deletes one slot: perfect for deleting individual save files.
- **Overwrite protection** = check if the slot is occupied before writing, then ask the player to confirm.
- **Empty slot loading** = always guard `getItem` with a null check. Show a message instead of crashing.
- **Confirmation pattern**: track a `pendingOverwrite` variable and a `pendingTime`. Cancel if they wait too long.
