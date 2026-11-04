// 6.14.14 Challenges: Make it yours (reference solution: two-hit bricks, points by row,
// and a wall read from rows of text).
// My rule: the top rows score more; without it every brick would be worth 10.

// Challenge 3: the wall is rows of text. # is a brick, 2 is a two-hit brick, . is a gap.
const SHAPE = [
  '22222222',
  '#.####.#',
  '########',
  '.######.',
  '..####..',
];
const BRICK_ROWS = SHAPE.length;
const BRICK_COLS = SHAPE[0].length;
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];

let bricks;             // bricks[r][c]: 0 is a gap, 1 is a brick, 2 is a two-hit brick
let score;

function setup() {
  new Canvas(400, 400);
  startGame();
}

function startGame() {
  bricks = makeBricks();
  score = 0;
}

// Read the wall from SHAPE: one number per letter.
function makeBricks() {
  const b = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      if (SHAPE[r][c] === '#') row.push(1);
      else if (SHAPE[r][c] === '2') row.push(2);
      else row.push(0);
    }
    b.push(row);
  }
  return b;
}

function draw() {
  background('#111');
  if (kb.presses('r')) startGame();
  if (mouse.presses()) hitAt(mouse.x, mouse.y);
  drawBricks();
}

// Draw a rectangle for every cell that holds a 1. The gaps draw nothing.
function drawBricks() {
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] > 0) {
        fill(bricks[r][c] === 2 ? 'silver' : ROW_COLORS[r]);
        rect(c * BW, TOP + r * BH, BW, BH);
      }
    }
  }
}

// Something hit the wall at pixel (x, y). If a brick is there, take it out and say true.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] > 0) {
    bricks[r][c] -= 1;
    score += (BRICK_ROWS - r) * 10;   // Challenge 2: the top rows are worth more
    return true;
  }
  return false;
}

// How many bricks are still standing?
function bricksLeft() {
  let n = 0;
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] > 0) n += 1;
    }
  }
  return n;
}

function drawTop() {
  fill('white');
  textSize(16);
  text('bricks left: ' + bricksLeft(), 12, 24);
  text('score: ' + score, 300, 24);
  if (score > 0 && bricksLeft() === 0) {
    textSize(32);
    text('Cleared!', 140, 260);
    textSize(16);
    text('Press R for a new wall', 110, 290);
  }
}
