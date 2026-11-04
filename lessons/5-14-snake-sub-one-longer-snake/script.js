// 5.14.2 Sub-build: One longer snake.
// The head walks the grid alone.

const CELL = 20;
let headX = 100, headY = 200;
let body = [];

function setup() {
  new Canvas(400, 400);
  every(12, () => {
    // STEP 1: remember where the head was, then move it one cell.
    headX += CELL;
    if (headX > width - CELL) headX = 0;
  });
}

function draw() {
  background('white');
  fill('green');
  rect(headX, headY, CELL, CELL);
  // STEP 2: draw every segment in the body array.
}
