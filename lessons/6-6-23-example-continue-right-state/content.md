**Goal:** when the player clicks Continue, load the save data AND restore the correct state. If they saved during `'play'`, resume playing. If they saved on `'gameover'`, show the game over screen. Restore state first, then restore state-specific data.

## Step 1: Check if a save exists on startup

Before showing the title screen, check localStorage. If there's a save, the title screen should offer a Continue option.

```js live
let state;
let score, level;
let player;
let hasSave;

function setup() {
  new Canvas(600, 400);
  player = new Sprite(300, 200, 30, 30);
  player.color = 'cyan';
  state = 'title';
  score = 0;
  level = 1;

  let raw = getItem('statesave');
  hasSave = raw !== null;
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      textAlign(CENTER);
      textSize(32);
      fill('white');
      text('Three-State Machine', 300, 100);
      textSize(16);
      text('Press N for New Game', 300, 170);
      if (hasSave) {
        fill('gold');
        text('Press C to Continue', 300, 210);
      }
      if (kb.presses('n')) {
        state = 'play';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;

    case 'play':
      fill('white');
      textSize(16);
      textAlign(LEFT);
      text('Score: ' + score + '  Level: ' + level, 20, 30);
      if (kb.pressing('a')) player.vel.x = -4;
      else if (kb.pressing('d')) player.vel.x = 4;
      else player.vel.x = 0;
      if (kb.pressing('w')) player.vel.y = -4;
      else if (kb.pressing('s')) player.vel.y = 4;
      else player.vel.y = 0;
      if (frameCount % 60 === 0) score++;
      if (score >= 30) {
        state = 'gameover';
      }
      break;

    case 'gameover':
      textAlign(CENTER);
      textSize(32);
      fill('red');
      text('GAME OVER', 300, 150);
      textSize(16);
      fill('white');
      text('Final Score: ' + score + '  Level: ' + level, 300, 200);
      text('Press ENTER to restart', 300, 260);
      if (kb.presses('enter')) {
        state = 'title';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;
  }
}
```

Run it. Refresh the page: `hasSave` is `false` (no save yet), so only New Game appears. We haven't connected the Continue button yet, but the check is in place.

## Step 2: Press C to Continue: restore the saved state

When the player presses C, read the saved JSON, parse it, and set `state` from `saved.state`. That one assignment routes the switch to the right case.

```js live
let state;
let score, level;
let player;
let hasSave;

function setup() {
  new Canvas(600, 400);
  player = new Sprite(300, 200, 30, 30);
  player.color = 'cyan';
  state = 'title';
  score = 0;
  level = 1;

  let raw = getItem('statesave');
  hasSave = raw !== null;
}

function saveGame() {
  let saveData = {
    state: state,
    score: score,
    level: level,
    playerX: player.x,
    playerY: player.y
  };
  storeItem('statesave', JSON.stringify(saveData));
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      textAlign(CENTER);
      textSize(32);
      fill('white');
      text('Three-State Machine', 300, 100);
      textSize(16);
      text('Press N for New Game', 300, 170);
      if (hasSave) {
        fill('gold');
        text('Press C to Continue', 300, 210);
        if (kb.presses('c')) {
          let raw = getItem('statesave');
          let saved = JSON.parse(raw);
          state = saved.state;
          score = saved.score;
          level = saved.level;
          player.x = saved.playerX;
          player.y = saved.playerY;
        }
      }
      if (kb.presses('n')) {
        state = 'play';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;

    case 'play':
      fill('white');
      textSize(16);
      textAlign(LEFT);
      text('Score: ' + score + '  Level: ' + level, 20, 30);
      if (kb.pressing('a')) player.vel.x = -4;
      else if (kb.pressing('d')) player.vel.x = 4;
      else player.vel.x = 0;
      if (kb.pressing('w')) player.vel.y = -4;
      else if (kb.pressing('s')) player.vel.y = 4;
      else player.vel.y = 0;
      if (frameCount % 60 === 0) score++;
      if (score >= 30) {
        state = 'gameover';
        saveGame();
      }
      break;

    case 'gameover':
      textAlign(CENTER);
      textSize(32);
      fill('red');
      text('GAME OVER', 300, 150);
      textSize(16);
      fill('white');
      text('Final Score: ' + score + '  Level: ' + level, 300, 200);
      text('Press ENTER to restart', 300, 260);
      if (kb.presses('enter')) {
        state = 'title';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;
  }
}
```

Test it: start a new game, let the score climb to 30 (gameover triggers and saves). Refresh the page. Press C. The state snaps to `'gameover'`, and the game over screen renders with the saved score and level.

## Step 3: Continue from 'play' state too

Save not just on gameover, but also when the player presses S during play (a manual save checkpoint). Then Continue restores you mid-play.

```js live
let state;
let score, level;
let player;
let hasSave;

function setup() {
  new Canvas(600, 400);
  player = new Sprite(300, 200, 30, 30);
  player.color = 'cyan';
  state = 'title';
  score = 0;
  level = 1;

  let raw = getItem('statesave');
  hasSave = raw !== null;
}

function saveGame() {
  let saveData = {
    state: state,
    score: score,
    level: level,
    playerX: player.x,
    playerY: player.y
  };
  storeItem('statesave', JSON.stringify(saveData));
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      textAlign(CENTER);
      textSize(32);
      fill('white');
      text('Three-State Machine', 300, 100);
      textSize(16);
      text('Press N for New Game', 300, 170);
      if (hasSave) {
        fill('gold');
        text('Press C to Continue', 300, 210);
        if (kb.presses('c')) {
          let raw = getItem('statesave');
          let saved = JSON.parse(raw);
          state = saved.state;
          score = saved.score;
          level = saved.level;
          player.x = saved.playerX;
          player.y = saved.playerY;
        }
      }
      if (kb.presses('n')) {
        state = 'play';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;

    case 'play':
      fill('white');
      textSize(16);
      textAlign(LEFT);
      text('Score: ' + score + '  Level: ' + level, 20, 30);
      if (kb.pressing('a')) player.vel.x = -4;
      else if (kb.pressing('d')) player.vel.x = 4;
      else player.vel.x = 0;
      if (kb.pressing('w')) player.vel.y = -4;
      else if (kb.pressing('s')) player.vel.y = 4;
      else player.vel.y = 0;
      if (frameCount % 60 === 0) score++;
      if (kb.presses('s')) {
        saveGame();
        fill('gold');
        textSize(14);
        text('Game saved!', 20, 60);
      }
      if (score >= 30) {
        state = 'gameover';
        saveGame();
      }
      break;

    case 'gameover':
      textAlign(CENTER);
      textSize(32);
      fill('red');
      text('GAME OVER', 300, 150);
      textSize(16);
      fill('white');
      text('Final Score: ' + score + '  Level: ' + level, 300, 200);
      text('Press ENTER to restart', 300, 260);
      if (kb.presses('enter')) {
        state = 'title';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;
  }
}
```

Press N to start. Move the player, press S mid-game. Refresh. Press C. You resume exactly where you were: same score, same position, same `'play'` state. The save system is state-aware.

## Step 4: Handle missing fields with defaults

What if the save data is missing a field? An old save might not have all the properties. Use `||` defaults on every restored field so the game doesn't break.

```js live
let state;
let score, level;
let player;
let hasSave;

function setup() {
  new Canvas(600, 400);
  player = new Sprite(300, 200, 30, 30);
  player.color = 'cyan';
  state = 'title';
  score = 0;
  level = 1;

  let raw = getItem('statesave');
  hasSave = raw !== null;
}

function loadGame() {
  let raw = getItem('statesave');
  if (!raw) return;
  let saved = JSON.parse(raw);
  state = saved.state || 'title';
  score = saved.score || 0;
  level = saved.level || 1;
  player.x = saved.playerX || 300;
  player.y = saved.playerY || 200;
}

function saveGame() {
  let saveData = {
    state: state,
    score: score,
    level: level,
    playerX: player.x,
    playerY: player.y
  };
  storeItem('statesave', JSON.stringify(saveData));
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      textAlign(CENTER);
      textSize(32);
      fill('white');
      text('Three-State Machine', 300, 100);
      textSize(16);
      text('Press N for New Game', 300, 170);
      if (hasSave) {
        fill('gold');
        text('Press C to Continue', 300, 210);
        if (kb.presses('c')) {
          loadGame();
        }
      }
      if (kb.presses('n')) {
        state = 'play';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;

    case 'play':
      fill('white');
      textSize(16);
      textAlign(LEFT);
      text('Score: ' + score + '  Level: ' + level, 20, 30);
      if (kb.pressing('a')) player.vel.x = -4;
      else if (kb.pressing('d')) player.vel.x = 4;
      else player.vel.x = 0;
      if (kb.pressing('w')) player.vel.y = -4;
      else if (kb.pressing('s')) player.vel.y = 4;
      else player.vel.y = 0;
      if (frameCount % 60 === 0) score++;
      if (kb.presses('s')) {
        saveGame();
        fill('gold');
        textSize(14);
        text('Game saved!', 20, 60);
      }
      if (score >= 30) {
        state = 'gameover';
        saveGame();
      }
      break;

    case 'gameover':
      textAlign(CENTER);
      textSize(32);
      fill('red');
      text('GAME OVER', 300, 150);
      textSize(16);
      fill('white');
      text('Final Score: ' + score + '  Level: ' + level, 300, 200);
      text('Press ENTER to restart', 300, 260);
      if (kb.presses('enter')) {
        state = 'title';
        score = 0;
        level = 1;
        player.x = 300;
        player.y = 200;
      }
      break;
  }
}
```

The `loadGame()` function wraps everything cleanly. Every field uses `||` with a sensible fallback: missing state? Use `'title'`. Missing score? Use `0`. This guards against corrupted or partial saves: the player never gets stuck in an undefined state.

## Key takeaways

- `getItem('savekey')` returns `null` when nothing is saved: check for `null` before offering Continue
- Restore state first (`state = saved.state`), then restore the data that state needs
- Pull load logic into a named function (`loadGame()`) so Continue stays a one-liner
- Use `||` defaults for every restored field: old saves might be missing properties
- The save object is the contract between your save system and your state machine: include the state name, include all state-specific data
