// 6.14.11 Lab: A wall of bricks.

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
  // STEP 1: build the wall. For each of BRICK_ROWS rows make a row, push
  //   BRICK_COLS ones into it, and push the row onto b.
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
  // STEP 2: find the brick at pixel (x, y): c = floor(x / BW) and r =
  //   floor((y - TOP) / BH). If that row and column are inside the wall AND the
  //   cell is 1, set it to 0, add 10 to score and return true.
  return false;
}

// How many bricks are still standing?
function bricksLeft() {
  let n = 0;
  // STEP 3: count the bricks still standing: two loops over the wall, adding
  //   1 to n for every cell that is 1.
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
