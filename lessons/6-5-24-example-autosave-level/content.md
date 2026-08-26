**Goal:** Implement two auto-save triggers: one that fires when the player reaches a level-complete zone, and one that fires on a timer every ~30 seconds.

## Step 1: A simple game with a goal zone

You have a player you can move with the arrow keys, a score that ticks up, and a "level complete" zone (a green sprite) on the right side of the canvas. Reach the zone to trigger an auto-save.

```js live
let player;
let goalZone;
let score = 0;
let level = 1;
let autoSaved = false;

function setup() {
  new Canvas(600, 200);

  player = new Sprite(60, 100, 30, 30);
  player.color = '#66d9ef';

  goalZone = new Sprite(560, 100, 40, 100);
  goalZone.color = '#50fa7b';
  goalZone.collider = 'none';
}

function draw() {
  background('#222');

  score = score + 1;

  fill('#50fa7b');
  textSize(14);
  text('GOAL', 530, 30);

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 50);

  // Simple arrow-key movement
  if (kb.pressing('left')) player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;

  // Bounds
  if (player.x < 20) player.x = 20;
  if (player.x > 580) player.x = 580;
}
```

## Step 2: Auto-save when the player overlaps the goal zone

When the player sprite overlaps the goal zone, increment the level, build a save object with score and level, and write it to localStorage. The save fires automatically: no key press required.

```js live
let player;
let goalZone;
let score = 0;
let level = 1;

function setup() {
  new Canvas(600, 200);

  player = new Sprite(60, 100, 30, 30);
  player.color = '#66d9ef';

  goalZone = new Sprite(560, 100, 40, 100);
  goalZone.color = '#50fa7b';
  goalZone.collider = 'none';

  // Try loading previous auto-save on startup
  let saved = getItem('autoSave');
  if (saved) {
    let data = JSON.parse(saved);
    level = data.level || 1;
    score = data.score || 0;
  }
}

function draw() {
  background('#222');

  score = score + 1;

  fill('#50fa7b');
  textSize(14);
  text('GOAL', 530, 30);

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 50);

  if (kb.pressing('left')) player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;

  if (player.x < 20) player.x = 20;
  if (player.x > 580) player.x = 580;

  // Overlap check for level-complete auto-save
  if (player.overlaps(goalZone)) {
    level = level + 1;
    player.x = 60;
    let saveData = JSON.stringify({ score: score, level: level });
    storeItem('autoSave', saveData);
    console.log('Auto-saved! Level:', level, 'Score:', score);
  }
}
```

## Step 3: Add a timer-based auto-save

In addition to the zone trigger, auto-save every ~30 seconds of gameplay (`frameCount % 1800 === 0`). Both triggers write to the same `'autoSave'` key: you don't need two save slots for two triggers.

```js live
let player;
let goalZone;
let score = 0;
let level = 1;

function setup() {
  new Canvas(600, 200);

  player = new Sprite(60, 100, 30, 30);
  player.color = '#66d9ef';

  goalZone = new Sprite(560, 100, 40, 100);
  goalZone.color = '#50fa7b';
  goalZone.collider = 'none';

  let saved = getItem('autoSave');
  if (saved) {
    let data = JSON.parse(saved);
    level = data.level || 1;
    score = data.score || 0;
  }
}

function draw() {
  background('#222');

  score = score + 1;

  fill('#50fa7b');
  textSize(14);
  text('GOAL', 530, 30);

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 50);

  if (kb.pressing('left')) player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;

  if (player.x < 20) player.x = 20;
  if (player.x > 580) player.x = 580;

  if (player.overlaps(goalZone)) {
    level = level + 1;
    player.x = 60;
    let saveData = JSON.stringify({ score: score, level: level });
    storeItem('autoSave', saveData);
    console.log('Auto-saved on level complete! Level:', level);
  }

  // Timer-based auto-save (~30 seconds at 60fps)
  if (frameCount % 1800 === 0 && frameCount > 0) {
    let saveData = JSON.stringify({ score: score, level: level });
    storeItem('autoSave', saveData);
    console.log('Auto-saved on timer! Frame:', frameCount);
  }
}
```

## Step 4: Show a subtle "Saving..." indicator

Auto-save should be invisible, but a brief visual cue helps debugging and gives the player confidence. Show "Saving..." text that fades after a second.

```js live
let player;
let goalZone;
let score = 0;
let level = 1;
let saveFlash = 0;
let saveReason = '';

function setup() {
  new Canvas(600, 200);

  player = new Sprite(60, 100, 30, 30);
  player.color = '#66d9ef';

  goalZone = new Sprite(560, 100, 40, 100);
  goalZone.color = '#50fa7b';
  goalZone.collider = 'none';

  let saved = getItem('autoSave');
  if (saved) {
    let data = JSON.parse(saved);
    level = data.level || 1;
    score = data.score || 0;
  }
}

function draw() {
  background('#222');

  score = score + 1;

  fill('#50fa7b');
  textSize(14);
  text('GOAL', 530, 30);

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 50);

  if (kb.pressing('left')) player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;

  if (player.x < 20) player.x = 20;
  if (player.x > 580) player.x = 580;

  // Level-complete auto-save
  if (player.overlaps(goalZone)) {
    level = level + 1;
    player.x = 60;
    let saveData = JSON.stringify({ score: score, level: level });
    storeItem('autoSave', saveData);
    saveFlash = 60;
    saveReason = 'Level ' + level + ' reached!';
  }

  // Timer-based auto-save
  if (frameCount % 1800 === 0 && frameCount > 0) {
    let saveData = JSON.stringify({ score: score, level: level });
    storeItem('autoSave', saveData);
    saveFlash = 60;
    saveReason = 'Timer save';
  }

  // Subtle save indicator
  if (saveFlash > 0) {
    fill('#f1fa8c');
    textSize(12);
    text('Saving... ' + saveReason, 10, 190);
    saveFlash = saveFlash - 1;
  }
}
```

## Key takeaways

- **Trigger-based auto-save** fires on a game event: overlapping a zone, hitting a score threshold, changing levels. It saves automatically; the player doesn't press anything.
- **Timer-based auto-save** fires at regular intervals: `frameCount % N === 0`. Use a reasonable interval (15-60 seconds), not every frame.
- **One key is enough.** Both triggers can write to the same `storeItem` key. The latest data overwrites the old: that's the point.
- **Keep the indicator subtle.** A brief "Saving..." that fades in ~1 second builds confidence without being distracting. In a polished game, you might skip the indicator entirely.
- **Guard against re-fires.** An overlap check fires every frame while the player stands on the zone. Either reset the player's position (like above) or use a boolean flag to save once per overlap.
