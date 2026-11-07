// 6.27.3 Sub-build: A checkered board.
// 8 by 8 squares. A square is dark when its row plus its column is odd.

const N = 8;
const CELL = 50;

function setup() {
  new Canvas(N * CELL, N * CELL);
}

function draw() {
  noStroke();
  // STEP: two loops, one inside the other, visit every row r and every column c.
  // Pick a dark colour when (r + c) % 2 === 1 and a light one otherwise, then draw the square.
}
