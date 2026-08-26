# 2.5.12 Worked Example: Restore Full Player State from a Save

Teacher-led walkthrough for loading and applying saved game state with `getItem` + `JSON.parse`.

**Goal:** Load a saved game: check `getItem` for null, `JSON.parse` the string, coerce numbers, then apply values to your game objects.

---

## Step 1: Check if a save exists

`getItem` returns `null` when nothing is stored under that key. Always check before parsing.

```js live
let player, score, level;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 30, 30);
  player.color = 'deepskyblue';

  let raw = getItem('playerSave');
  if (raw !== null) {
    console.log('Save found!');
  } else {
    console.log('No save yet.');
    score = 0;
    level = 1;
  }
}

function draw() {
  background('#222');

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 45);
  text('Check console for save status', 10, 70);
}
```

No save yet: shows 0 and 1. That's fine. The important thing is that skipping the null check would crash with `JSON.parse`.

---

## Step 2: JSON.parse and coerce numbers

When a save exists, parse the JSON and coerce every numeric field with `Number()`.

```js live
let player, score, level;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 30, 30);
  player.color = 'deepskyblue';

  let raw = getItem('playerSave');
  if (raw !== null) {
    let state = JSON.parse(raw);
    score = Number(state.score) || 0;
    level = Number(state.level) || 1;
    player.x = Number(state.playerX) || 250;
    player.y = Number(state.playerY) || 200;
    console.log('Save restored!');
  } else {
    console.log('No save yet: using defaults');
    score = 0;
    level = 1;
  }
}

function draw() {
  background('#222');

  if (kb.pressing('left'))  player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;

  if (kb.pressing('up'))    player.vel.y = -4;
  else if (kb.pressing('down')) player.vel.y = 4;
  else player.vel.y = 0;

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 45);
  text('Player: (' + round(player.x) + ', ' + round(player.y) + ')', 10, 65);
}
```

If you saved in 2.5.11, you'll see your old score and player position snap back. If not, you get clean defaults.

Notice `Number(state.something) || 1`: the `|| 1` is the fallback if the field is missing or NaN.

---

## Step 3: Apply saved values to game objects

After parse and coerce, apply: `player.x = state.playerX`, `score = state.score`. Direct assignment: the object just takes the value.

The key insight: after you parse, the save is just values. You own how they're applied. Doesn't have to be one-to-one. You could add 100 to `playerX` to offset for a different starting area, or multiply score by a difficulty multiplier.

---

## Step 4: Full round-trip: save AND load

This is the complete pattern. Save on 'S', auto-load on startup. Persistent across refreshes.

```js live
let player, score, level;
let saveMsg = 0;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 30, 30);
  player.color = 'deepskyblue';

  let raw = getItem('fullSave');
  if (raw !== null) {
    let state = JSON.parse(raw);
    score = Number(state.score) || 0;
    level = Number(state.level) || 1;
    player.x = Number(state.playerX) || 250;
    player.y = Number(state.playerY) || 200;
    player.color = state.playerColor || 'deepskyblue';
    console.log('Round-trip restore complete');
  } else {
    score = 0;
    level = 1;
    console.log('Fresh start');
  }
}

function draw() {
  background('#222');

  if (kb.pressing('left'))  player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;

  if (kb.pressing('up'))    player.vel.y = -4;
  else if (kb.pressing('down')) player.vel.y = 4;
  else player.vel.y = 0;

  if (kb.pressed('space')) score = score + 10;
  if (kb.pressed('l')) level = level + 1;

  if (kb.pressed('s')) {
    let saveObj = {
      score: score,
      level: level,
      playerX: round(player.x),
      playerY: round(player.y),
      playerColor: player.color
    };
    storeItem('fullSave', JSON.stringify(saveObj));
    saveMsg = 120;
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 45);
  text('Player: (' + round(player.x) + ', ' + round(player.y) + ')', 10, 65);

  if (saveMsg > 0) {
    fill('lime');
    textSize(18);
    text('Game saved!', 200, 370);
    saveMsg = saveMsg - 1;
  }

  fill('#888');
  textSize(13);
  text('Arrows = move | SPACE = +10 | L = +1 level | S = save', 10, 95);
}
```

Now the real test: move somewhere, score some points, press S. Then **refresh the page**. Your position, score, and level all come back.

---

## Key takeaways

- **Check for null.** `getItem` returns `null` when nothing's been saved. Parse `null` and you crash.
- **Coerce after parse.** `JSON.parse` restores numbers correctly, but always `Number()` fields you depend on. It's one line and defends against bad data.
- **Apply to game objects.** Parsing gives you values. You own what to do with them: put them into sprites, variables, whatever holds your game state.
- **The round-trip is reliable.** Once you wire both directions (save + restore), refresh becomes invisible to your players.
