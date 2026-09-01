**Goal:** modify the three-state machine so save/load is wired into state transitions. When the player enters 'gameover', auto-save score and level. When they enter 'win', save the victory. The save object always includes the current state name.

## Step 1: Start from the three-state machine + save system

The foundation: a `state` variable that switches between `'title'`, `'play'`, and `'gameover'`. Each case draws its own screen. Save and load helpers already exist.

```js live
let state;
let score, level;
let player;

function setup() {
  new Canvas(600, 400);
  player = new Sprite(300, 200, 30, 30);
  player.color = 'cyan';
  state = 'title';
  score = 0;
  level = 1;
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      textAlign(CENTER);
      textSize(32);
      fill('white');
      text('Three-State Machine', 300, 120);
      textSize(16);
      text('Press ENTER to start', 300, 180);
      if (kb.presses('enter')) {
        state = 'play';
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

Press ENTER to start. The score ticks up. At 30 points, the state flips to `'gameover'`. No saves happen yet.

## Step 2: Auto-save when state changes to 'gameover'

Instead of just switching to `'gameover'`, build a function that saves the full game state. Call it every time you enter a state that needs persistence. Save score, level, and the state name itself.

```js live
let state;
let score, level;
let player;

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

function setup() {
  new Canvas(600, 400);
  player = new Sprite(300, 200, 30, 30);
  player.color = 'cyan';
  state = 'title';
  score = 0;
  level = 1;
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      textAlign(CENTER);
      textSize(32);
      fill('white');
      text('Three-State Machine', 300, 120);
      textSize(16);
      text('Press ENTER to start', 300, 180);
      if (kb.presses('enter')) {
        state = 'play';
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

When `score >= 30`, we set `state = 'gameover'` and immediately call `saveGame()`. The save object bundles everything: the state name, the score, the level, and the player's position. Open your browser DevTools Application tab and look at localStorage: you'll see `statesave` holding your JSON.

## Step 3: Auto-save on 'win' too

A real game has multiple save-worthy moments. Add a win condition alongside game over: reach 60 points and you win. Save on both transitions.

```js live
let state;
let score, level, won;
let player;

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

function setup() {
  new Canvas(600, 400);
  player = new Sprite(300, 200, 30, 30);
  player.color = 'cyan';
  state = 'title';
  score = 0;
  level = 1;
  won = false;
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      textAlign(CENTER);
      textSize(32);
      fill('white');
      text('Three-State Machine', 300, 120);
      textSize(16);
      text('Press ENTER to start', 300, 180);
      if (kb.presses('enter')) {
        state = 'play';
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
      } else if (score >= 20) {
        state = 'win';
        won = true;
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

    case 'win':
      textAlign(CENTER);
      textSize(32);
      fill('gold');
      text('YOU WIN!', 300, 150);
      textSize(16);
      fill('white');
      text('Score: ' + score + '  Level: ' + level, 300, 200);
      text('Victory saved!', 300, 240);
      text('Press ENTER to restart', 300, 300);
      if (kb.presses('enter')) {
        state = 'title';
        score = 0;
        level = 1;
        won = false;
        player.x = 300;
        player.y = 200;
      }
      break;
  }
}
```

Two save points: `'gameover'` (at 30 pts) and `'win'` (at 20 pts: lowered for testing). Both call `saveGame()`, which stamps `state` into the save object. The win screen confirms "Victory saved!"

## Step 4: The save includes the state name

Look closely at `saveGame()`. `saveData.state = state`: it writes the **current** state name. When you save on `'gameover'`, the save object says `{state: 'gameover', score: ..., level: ...}`. When you save on `'win'`, it says `{state: 'win', ...}`.

This is the key insight: the save object remembers which screen to restore. Later, when you load, you read `saved.state` and set `state = saved.state`, and the switch falls into the right case automatically.

Hit ENTER to start, let the score run. After a save triggers, open DevTools → Application → Local Storage and examine `statesave`. You'll see the JSON structure: state name, score, level, position.

## Key takeaways

- Save on state entry: call `saveGame()` right after `state = '...'` whenever arrival at that state is worth remembering
- Include the current state name in the save data: `saveData.state = state`
- A single `saveGame()` function works for all states; the save object captures whichever state just activated
- Save at transitions that matter: game over, win, checkpoint, new level
- The save object is the bridge between state machines (Module 6.6) and persistence (Module 6.5)
