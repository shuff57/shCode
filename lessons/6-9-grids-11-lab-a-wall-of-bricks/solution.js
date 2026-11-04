// 6.14.11 Lab: A wall of bricks (reference solution: Brick wall, final).

const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];

let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
let score;

function setup() {
  new Canvas(400, 400);
  startGame();
}

function startGame() {
  bricks = makeBricks();
  score = 0;
}

// BRICK_ROWS rows of BRICK_COLS bricks, every cell a 1.
function makeBricks() {
  const b = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      row.push(1);
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
      if (bricks[r][c] === 1) {
        fill(ROW_COLORS[r]);
        rect(c * BW, TOP + r * BH, BW, BH);
      }
    }
  }
}

// Something hit the wall at pixel (x, y). If a brick is there, take it out and say true.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    score += 10;
    return true;
  }
  return false;
}

// How many bricks are still standing?
function bricksLeft() {
  let n = 0;
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) n += 1;
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
