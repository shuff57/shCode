// Sub-build: jump and take. A red token and a black one on a 4 by 4 board.
// Click red, then click the square two steps past black: red lands there and
// black is gone. The square jumped over is halfway: ((r1 + r2) / 2, (c1 + c2) / 2).

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
    else if (picked && grid[r][c] === '' && abs(r - picked.r) === 2 && abs(c - picked.c) === 2) {
      const mr = (r + picked.r) / 2;
      const mc = (c + picked.c) / 2;
      if (grid[mr][mc] === 'b') {
        grid[mr][mc] = '';
        grid[r][c] = 'r';
        grid[picked.r][picked.c] = '';
        picked = null;
      }
    }
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
