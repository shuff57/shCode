// Sub-build: a checkered board. 8 by 8 squares; a square is dark when its
// row plus its column is odd.

const N = 8;
const CELL = 50;

function setup() {
  new Canvas(N * CELL, N * CELL);
}

function draw() {
  noStroke();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
      rect(c * CELL, r * CELL, CELL, CELL);
    }
  }
}
