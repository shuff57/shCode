# 2.5.11 Worked Example: Save Full Player State

Teacher-led walkthrough for saving a complete game state with `storeItem` + `JSON.stringify`.

**Goal:** Build a game with a moving player, score, and level. Save everything as one JSON object with `storeItem`.

---

## Step 1: Player + score + level

Start with a player sprite and keyboard movement. Track score and level.

```js live
let player, score, level;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 30, 30);
  player.color = 'deepskyblue';
  score = 0;
  level = 1;
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
}
```

Run it. Move the player around with the arrow keys.

---

## Step 2: Build the save object

Add keyboard input for adjusting score and level (so we have something to save), then build a saveState object.

```js live
let player, score, level;
let lastSaved = 0;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 30, 30);
  player.color = 'deepskyblue';
  score = 0;
  level = 1;
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

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 45);
  text('Player: (' + round(player.x) + ', ' + round(player.y) + ')', 10, 65);

  fill('#888');
  textSize(13);
  text('SPACE = +10 score | L = +1 level', 10, 95);
}
```

Try it: press Space to build points, L to level up. These are values we can save.

---

## Step 3: Save on 'S' key

Now add the actual save: build an object, stringify it, store it.

```js live
let player, score, level;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 30, 30);
  player.color = 'deepskyblue';
  score = 0;
  level = 1;
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
      playerY: round(player.y)
    };
    storeItem('playerSave', JSON.stringify(saveObj));
    console.log('Game saved!');
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 45);
  text('Player: (' + round(player.x) + ', ' + round(player.y) + ')', 10, 65);

  fill('#888');
  textSize(13);
  text('SPACE = +10 | L = +1 level | S = save', 10, 95);
}
```

Move the player somewhere, press Space a few times, then press S. Check the console: "Game saved!" appears.

---

## Step 4: Display confirmation text

Show "Game saved!" on screen briefly after saving, using `frameCount` for a timed message.

```js live
let player, score, level;
let saveMessageFrames = 0;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 30, 30);
  player.color = 'deepskyblue';
  score = 0;
  level = 1;
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
      playerY: round(player.y)
    };
    storeItem('playerSave', JSON.stringify(saveObj));
    saveMessageFrames = 120;
  }

  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 25);
  text('Level: ' + level, 10, 45);
  text('Player: (' + round(player.x) + ', ' + round(player.y) + ')', 10, 65);

  if (saveMessageFrames > 0) {
    fill('lime');
    textSize(18);
    text('Game saved!', 200, 370);
    saveMessageFrames = saveMessageFrames - 1;
  }

  fill('#888');
  textSize(13);
  text('Arrows = move | SPACE = +10 | L = level | S = save', 10, 95);
}
```

Press S. The green "Game saved!" appears for about 2 seconds (120 frames at 60 fps), then fades out.

---

## Key takeaways

- The save object is a plain JS object with keys for everything worth remembering.
- `storeItem` wants a string. `JSON.stringify` turns the object into one.
- Save on a deliberate trigger (key press), not every frame: that would hammer storage.
- A timed confirmation message gives the player feedback without cluttering the screen.
