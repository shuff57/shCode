// 6.29.2 Sub-build: Jump and take.
// A red token and a black one on a 4 by 4 board. Click red, then click the
// square two steps past black: red lands there and black is gone.

const N = 4;
const CELL = 80;
let grid = [
  ['', '', '', ''],
  ['', '', '', ''],
  ['', 'b', '', ''],
  ['r', '', '', ''],
];
let picked = null;

function setup() {
  new Canvas(N * CELL, N * CELL);
}

function draw() {
  if (mouse.presses()) {
    const c = floor(mouse.x / CELL);
    const r = floor(mouse.y / CELL);
    if (grid[r][c] === 'r') picked = { r: r, c: c };
    // STEP: else, with red picked, a click on an empty square two rows and two columns
    // away is a jump, when the halfway square holds black. Take black, then move red.
  }
  noStroke();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
      rect(c * CELL, r * CELL, CELL, CELL);
      if (grid[r][c] !== '') {
        fill(grid[r][c] === 'r' ? 'tomato' : '#262626');
        circle(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL * 0.6);
      }
    }
  }
}
