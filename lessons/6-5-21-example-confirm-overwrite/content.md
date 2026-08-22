**Goal:** When the player saves to a slot that already has data, show an "Are you sure?" prompt. Only write to storage if they confirm.

## Step 1 — Start with a working save system

A player moves around. Press S to save to a single slot.

```js live
let player;
let score = 0;
let saved = false;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (kb.pressing('right'))     player.vel.x = 4;
  else if (kb.pressing('left')) player.vel.x = -4;
  else                          player.vel.x = 0;

  if (kb.pressing('down'))      player.vel.y = 4;
  else if (kb.pressing('up'))   player.vel.y = -4;
  else                          player.vel.y = 0;

  if (kb.presses('space')) score = score + 1;

  if (kb.presses('s')) {
    storeItem('saveSlot1', JSON.stringify({ x: player.x, y: player.y, score: score }));
    saved = true;
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Position: ' + round(player.x) + ', ' + round(player.y), 10, 45);

  fill('#8be9fd');
  textSize(12);
  text('Press S to save', 10, 70);

  if (saved) {
    fill('#50fa7b');
    text('Saved!', 10, 90);
  }
}
```

The problem: press S again and the previous save is silently replaced. No warning, no undo.

## Step 2 — Detect when a slot is already occupied

Before saving, check if the slot has data. If it does, enter a "confirmation" state instead of saving immediately.

```js live
let player;
let score = 0;
let confirming = false;
let confirmTimer = 0;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (!confirming) {
    if (kb.pressing('right'))     player.vel.x = 4;
    else if (kb.pressing('left')) player.vel.x = -4;
    else                          player.vel.x = 0;

    if (kb.pressing('down'))      player.vel.y = 4;
    else if (kb.pressing('up'))   player.vel.y = -4;
    else                          player.vel.y = 0;
    if (kb.presses('space')) score = score + 1;
  }

  if (kb.presses('s') && !confirming) {
    if (getItem('saveSlot1') !== null) {
      confirming = true;
      confirmTimer = millis();
    } else {
      storeItem('saveSlot1', JSON.stringify({ x: player.x, y: player.y, score: score }));
    }
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);

  fill('#8be9fd');
  textSize(12);
  text('Press S to save', 10, 50);

  if (confirming) {
    drawConfirmation();
  }

  // Auto-cancel after 3 seconds
  if (confirming && millis() - confirmTimer > 3000) {
    confirming = false;
  }
}

function drawConfirmation() {
  fill('#282a36');
  rect(75, 110, 250, 80, 8);

  fill('#f1fa8c');
  textSize(16);
  text('Overwrite save?', 135, 135);

  fill('white');
  textSize(14);
  text('Y — Yes, save over it', 100, 160);
  text('N — No, keep old save', 100, 180);
}
```

Press S once to save. Move somewhere else. Press S again — a confirmation dialog appears instead of instantly overwriting.

## Step 3 — Handle Y and N responses

Y confirms the overwrite and saves. N cancels. The player can't move while confirming.

```js live
let player;
let score = 0;
let confirming = false;
let confirmTimer = 0;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (!confirming) {
    if (kb.pressing('right'))     player.vel.x = 4;
    else if (kb.pressing('left')) player.vel.x = -4;
    else                          player.vel.x = 0;

    if (kb.pressing('down'))      player.vel.y = 4;
    else if (kb.pressing('up'))   player.vel.y = -4;
    else                          player.vel.y = 0;
    if (kb.presses('space')) score = score + 1;
  }

  if (kb.presses('s') && !confirming) {
    if (getItem('saveSlot1') !== null) {
      confirming = true;
      confirmTimer = millis();
    } else {
      doSave();
    }
  }

  if (confirming) {
    if (kb.presses('y')) {
      doSave();
      confirming = false;
    }
    if (kb.presses('n')) {
      confirming = false;
    }
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);

  fill('#8be9fd');
  textSize(12);
  text('Press S to save', 10, 50);

  if (confirming) {
    drawConfirmation();
  }

  if (confirming && millis() - confirmTimer > 3000) {
    confirming = false;
  }
}

function doSave() {
  storeItem('saveSlot1', JSON.stringify({ x: player.x, y: player.y, score: score }));
}

function drawConfirmation() {
  fill('#282a36');
  rect(75, 110, 250, 80, 8);

  fill('#f1fa8c');
  textSize(16);
  text('Overwrite save?', 135, 135);

  fill('white');
  textSize(14);
  text('Y — Yes, save over it', 100, 160);
  text('N — No, keep old save', 100, 180);
}
```

## Step 4 — Add a visual timer and polish

Show a shrinking bar that indicates how much time is left to decide. Freeze the player during confirmation.

```js live
let player;
let score = 0;
let confirming = false;
let confirmTimer = 0;
let messageText = '';
let messageTimer = 0;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 150, 20, 20);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (!confirming) {
    if (kb.pressing('right'))     player.vel.x = 4;
    else if (kb.pressing('left')) player.vel.x = -4;
    else                          player.vel.x = 0;

    if (kb.pressing('down'))      player.vel.y = 4;
    else if (kb.pressing('up'))   player.vel.y = -4;
    else                          player.vel.y = 0;
    if (kb.presses('space')) score = score + 1;
  }

  if (kb.presses('s') && !confirming) {
    if (getItem('saveSlot1') !== null) {
      confirming = true;
      confirmTimer = millis();
    } else {
      doSave();
    }
  }

  if (confirming) {
    if (kb.presses('y')) {
      doSave();
      confirming = false;
      messageText = 'Save overwritten!';
      messageTimer = millis();
    }
    if (kb.presses('n')) {
      confirming = false;
      messageText = 'Save kept.';
      messageTimer = millis();
    }
  }

  if (confirming && millis() - confirmTimer > 3000) {
    confirming = false;
    messageText = 'Timed out. Save kept.';
    messageTimer = millis();
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);

  fill('#8be9fd');
  textSize(12);
  text('Press S to save', 10, 50);

  if (confirming) {
    drawConfirmation();
  }

  if (messageText !== '' && millis() - messageTimer < 1500) {
    fill('#50fa7b');
    textSize(12);
    text(messageText, 10, 210);
  }
}

function doSave() {
  storeItem('saveSlot1', JSON.stringify({ x: player.x, y: player.y, score: score }));
}

function drawConfirmation() {
  fill('#282a36');
  rect(75, 110, 250, 80, 8);

  fill('#f1fa8c');
  textSize(16);
  text('Overwrite save?', 135, 135);

  fill('white');
  textSize(14);
  text('Y — Yes, save over it', 100, 160);
  text('N — No, keep old save', 100, 180);

  // Timer bar
  let elapsed = millis() - confirmTimer;
  let barWidth = map(elapsed, 0, 3000, 250, 0);
  fill('#ff5555');
  rect(75, 195, barWidth, 4);
}
```

Save, move, save again. The confirmation dialog appears with a red timer bar counting down. Press Y to confirm, N to cancel, or wait 3 seconds for auto-cancel.

## Key takeaways

- **Check before writing** — `getItem(key) !== null` before calling `storeItem` lets you detect occupied slots.
- **Confirmation state** — a boolean variable (`confirming`) that freezes gameplay and shows a Yes/No prompt.
- **Destructive actions need confirmation** — overwriting a save is destructive (the old data is gone). Always confirm first.
- **Timeout as a safety net** — if the player doesn't respond, auto-cancel. Better to skip a save than to accidentally overwrite.
