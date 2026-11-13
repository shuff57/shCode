## Play the finished game

**Read before `5.13.1 Plan: Break Snake into parts`.** About 5 minutes. There is nothing to write here: you play.

By the end of this you should be able to answer:

- What does a finished Snake have that a block walking a grid does not?
- Which of those parts do you build in the next four modules (5.13 to 5.16)?

Snake looks like one idea and is really three: a world measured in cells, a body that is a list that grows at the front and shrinks at the back, and a check that searches that list. The next four modules build them one at a time. Before you start, play the game you are building towards. The code is hidden on purpose: you are not expected to read it yet.

**Try it:** press **Play**, then press ENTER to start. The keys are in the table below the game.

```js live demo size=420x420 id=snake-finished-game
// SNAKE: a finished demo built from the same pieces the Snake unit teaches.
//   a grid of 20 x 20 cells, one static sprite per body segment (.col / .row)
//   step(): segments.unshift(new head), then either grow or segments.pop() the tail
//   isBody(col, row): search the array to catch a bite
//   steering with kb.presses and a no-reverse rule
//   stepping every N frames, N getting smaller as the score climbs
//   game states ('title' | 'play' | 'over'), sound, storeItem / getItem, .life
//
// Controls:  arrow keys or WASD = steer     ENTER = start / play again
//            R = play again after Game Over

const CELL = 20;
const GRID = 20;
const SLOWEST = 8;          // frames between steps at the start
const FASTEST = 4;          // never faster than this
const FLASH_FRAMES = 36;    // the snake flashes red this long before the panel

let state;                  // 'title', 'play' or 'over'
let segments = [];          // segments[0] is the head, the last one is the tail
let food = null;
let dx, dy;                 // the direction the snake last moved
let queue = [];             // turns waiting for the next step (at most 2)
let score = 0;
let best = 0;
let newBest = false;
let won = false;
let lastStep = 0;           // frameCount of the most recent step
let overAt = 0;             // frameCount of the death
let pops = [];
let eyes = [];              // [white, white, pupil, pupil]: fixed, follow the head
let coinSound, loseSound, startSound, winSound;

// ---------- the grid ----------

function cellToPixel(n) {
  return n * CELL + CELL / 2;
}

function makeSegment(col, row) {
  const s = new Sprite(cellToPixel(col), cellToPixel(row), CELL - 2, CELL - 2, 'static');
  s.color = '#2ecc5c';
  s.col = col;
  s.row = row;
  return s;
}

function isBody(col, row) {
  for (const s of segments) {
    if (s.col === col && s.row === row) return true;
  }
  return false;
}

// Food goes on a random cell that is not part of the snake.
// Returns null when the snake fills the whole board.
function makeFood() {
  const free = [];
  for (let col = 0; col < GRID; col++) {
    for (let row = 0; row < GRID; row++) {
      if (!isBody(col, row)) free.push({ col: col, row: row });
    }
  }
  if (free.length === 0) return null;
  const spot = free[floor(random(free.length))];
  const f = new Sprite(cellToPixel(spot.col), cellToPixel(spot.row), CELL - 6, CELL - 6, 'static');
  f.color = 'crimson';
  f.col = spot.col;
  f.row = spot.row;
  return f;
}

// ---------- speed ----------

// How many frames pass between steps. It comes straight from the score,
// so it can never drift: 8 at the start, one frame quicker every 5 points,
// and 4 from a score of 20 (a snake 23 long) on.
function stepEvery() {
  return Math.max(FASTEST, SLOWEST - floor(score / 5));
}

// ---------- looks (none of this touches a collision) ----------

// Head bright, body fading a little toward the tail.
function paintSnake() {
  const n = segments.length;
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      segments[i].color = '#c6ff6e';
    } else {
      const t = n > 2 ? (i - 1) / (n - 2) : 0;
      const r = Math.round(46 - 22 * t);
      const g = Math.round(204 - 84 * t);
      const b = Math.round(92 - 32 * t);
      segments[i].color = 'rgb(' + r + ',' + g + ',' + b + ')';
    }
  }
}

function paintFlash() {
  const t = frameCount - overAt;
  if (t > FLASH_FRAMES) return;
  const c = floor(t / 6) % 2 === 0 ? '#ff4d4d' : '#9c2233';
  for (const s of segments) s.color = c;
}

function makeEyes() {
  for (let i = 0; i < 4; i++) {
    const e = new Sprite(-50, -50, i < 2 ? 6 : 3);
    e.collider = 'none';
    e.color = i < 2 ? 'white' : '#111';
    e.layer = 20 + (i < 2 ? 0 : 1);
    eyes.push(e);
  }
}

function placeEyes() {
  const head = segments[0];
  const hx = head.x;
  const hy = head.y;
  const px = -dy;               // sideways, at right angles to the heading
  const py = dx;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1;
    const ex = hx + dx * 3 + px * 4 * side;
    const ey = hy + dy * 3 + py * 4 * side;
    eyes[i].x = ex;
    eyes[i].y = ey;
    eyes[i + 2].x = ex + dx * 1.2;
    eyes[i + 2].y = ey + dy * 1.2;
  }
}

function pop(col, row) {
  const p = new Sprite(cellToPixel(col), cellToPixel(row), CELL - 4);
  p.collider = 'none';
  p.color = '#ffd9d9';
  p.life = 12;
  pops.push(p);
}

function drawBoard() {
  background('#1a1c2c');
  noStroke();
  fill('#20233a');
  for (let col = 0; col < GRID; col++) {
    for (let row = 0; row < GRID; row++) {
      if ((col + row) % 2 === 0) rect(col * CELL, row * CELL, CELL, CELL);
    }
  }
}

// ---------- the rules ----------

// A turn goes in the queue. A reversal is judged against the LAST queued
// direction (or the current one if the queue is empty), so two quick presses
// between steps, like up then left, are both honoured.
function queueTurn(ndx, ndy) {
  if (queue.length >= 2) return;
  const last = queue.length > 0 ? queue[queue.length - 1] : { dx: dx, dy: dy };
  if (ndx === -last.dx && ndy === -last.dy) return;   // straight back: refused
  if (ndx === last.dx && ndy === last.dy) return;     // already going that way
  queue.push({ dx: ndx, dy: ndy });
}

function readSteering() {
  if (kb.presses('up')) queueTurn(0, -1);
  if (kb.presses('down')) queueTurn(0, 1);
  if (kb.presses('left')) queueTurn(-1, 0);
  if (kb.presses('right')) queueTurn(1, 0);
}

function finishRound(didWin) {
  state = 'over';
  won = didWin;
  overAt = frameCount;
  newBest = score > best;
  if (newBest) {
    best = score;
    storeItem('snakeBest', best);
  }
  (didWin ? winSound : loseSound).play();
}

function step() {
  if (queue.length > 0) {
    const next = queue.shift();
    dx = next.dx;
    dy = next.dy;
  }
  const head = segments[0];
  const col = head.col + dx;
  const row = head.row + dy;
  if (col < 0 || col >= GRID || row < 0 || row >= GRID || isBody(col, row)) {
    finishRound(false);
    return;
  }

  segments.unshift(makeSegment(col, row));
  if (food && col === food.col && row === food.row) {
    score += 1;
    coinSound.play();
    pop(col, row);
    food.delete();
    food = makeFood();            // the snake just grew, so this sees the new body
    if (food === null) finishRound(true);
  } else {
    const tail = segments.pop();
    tail.delete();
  }
  paintSnake();
}

function startRound() {
  for (const s of segments) s.delete();
  if (food) food.delete();
  for (const p of pops) p.delete();
  segments = [];
  pops = [];
  queue = [];
  for (let i = 0; i < 3; i++) segments.push(makeSegment(10 - i, 10));
  paintSnake();
  dx = 1;
  dy = 0;
  score = 0;
  won = false;
  newBest = false;
  food = makeFood();
  lastStep = frameCount;
  state = 'play';
}

// ---------- the sketch ----------

function setup() {
  new Canvas(400, 400);
  best = Number(getItem('snakeBest')) || 0;
  coinSound = loadSound('coin');
  loseSound = loadSound('lose');
  startSound = loadSound('select');
  winSound = loadSound('win');
  startRound();                 // a snake to look at behind the title
  state = 'title';
  makeEyes();
}

function draw() {
  drawBoard();

  if (state === 'title') {
    if (kb.presses('enter') || kb.presses('space')) {
      startRound();
      startSound.play();
    }
  } else if (state === 'play') {
    readSteering();
    if (frameCount - lastStep >= stepEvery()) {
      lastStep = frameCount;
      step();
    }
  } else if (state === 'over') {
    paintFlash();
    if (frameCount - overAt >= FLASH_FRAMES && (kb.presses('enter') || kb.presses('r'))) {
      startRound();
      startSound.play();
    }
  }

  pops = pops.filter(p => !p.removed);
  for (const p of pops) {
    p.diameter = p.diameter + 2.5;
    p.opacity = Math.max(0, p.life / 12);
  }
  placeEyes();
}

// Everything drawn here lands ON TOP of the sprites.
function drawTop() {
  noStroke();
  textAlign('left');
  fill('rgba(0, 0, 0, 0.45)');
  rect(6, 5, 118, 26, 8);
  rect(276, 5, 118, 26, 8);
  fill('white');
  textSize(16);
  text('SCORE ' + score, 14, 23);
  textAlign('right');
  text('BEST ' + best, 386, 23);
  textAlign('center');

  if (state === 'title') {
    fill('rgba(10, 12, 24, 0.95)');
    rect(0, 0, 400, 400);
    fill('#c6ff6e');
    textSize(60);
    text('SNAKE', 200, 150);
    fill('white');
    textSize(15);
    text('arrow keys or WASD to steer', 200, 200);
    textSize(13);
    fill('#8be9a0');
    text('eat the red food, never touch a wall or yourself', 200, 224);
    if (frameCount % 60 < 40) {
      fill('#f1fa8c');
      textSize(20);
      text('press ENTER to start', 200, 285);
    }
    fill('#9aa5d6');
    textSize(14);
    text('best: ' + best, 200, 325);
  }

  if (state === 'over' && frameCount - overAt >= FLASH_FRAMES) {
    fill('rgba(10, 12, 24, 0.92)');
    rect(50, 105, 300, 190, 14);
    fill(won ? '#f1fa8c' : '#ff6b6b');
    textSize(won ? 36 : 32);
    text(won ? 'YOU WIN!' : 'GAME OVER', 200, 158);
    fill('white');
    textSize(18);
    text('score: ' + score + '    best: ' + best, 200, 196);
    if (newBest) {
      fill('#f1fa8c');
      textSize(18);
      text('NEW BEST!', 200, 224);
    }
    fill('#8be9a0');
    textSize(15);
    text('press ENTER to play again', 200, 262);
  }
}
```

| Key | What it does |
| --- | --- |
| **Arrow keys** or **W A S D** | steer the snake |
| **ENTER** | starts the game, and plays again after GAME OVER |
| **R** | plays again after GAME OVER |

**What you'll see:** a 20 by 20 checkerboard, a green snake with a bright head and two eyes, and a red piece of food. The snake moves one cell at a time, not smoothly, and it gets faster as you eat.

**Try this, in order:**

1. Press **Play**, then ENTER. Steer with the arrow keys towards the red food.
2. Eat the food. The snake gets one cell longer and the score goes up by one. Watch the tail: on every step the back cell disappears, **except** on the step where you eat.
3. Press two arrow keys very quickly, such as UP then LEFT while heading right. Both count, and the snake turns twice without running into itself.
4. Steer into a wall, or into your own body. The snake flashes red, then the game says **GAME OVER** and shows your best score.
5. Press ENTER to play again. Notice that the score starts at 0 and the old snake is gone.

## What the game is made of

Every part of it is something you can name, and most of it you build in this unit.

| What you saw | Where you build it |
| --- | --- |
| the grid, and a block that walks one cell per step | 5.13 (this module) |
| steering with the arrow keys, and never turning straight back | 5.13 (this module) |
| a body that grows when it eats | 5.14 |
| dying when you bite yourself: a search of the body | 5.15 |
| playing it, then a faster snake, a best score and the quick double-turn | 5.16 (the challenges) |

Some parts are **not** built in this unit, and that is fine:

- **The title screen and the GAME OVER screen with the red flash** are a game that knows which screen it is on. That is 6.11 (Game State Machines).
- **A best score that survives closing the page** is saving and loading, 6.10. The best score in 5.16.3 lasts until you close the page.
- **The sounds** use `loadSound()`, which you meet in the Pinball unit (5.6).

**Try this next:** look at the table above and think about the game you just played. In 5.13.1 you will be asked to list the parts of Snake. You have just seen more than that.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **cell** | one square of the grid; the snake and the food always sit on whole cells |
| **segment** | one cell of the snake's body |
| **head and tail** | the first and last segments of the body |
| **best score** | the highest score so far, kept so the next game has something to beat |
