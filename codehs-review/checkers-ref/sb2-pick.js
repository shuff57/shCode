// Sub-build: pick up and put down. One token on a 4 by 4 board. Click it to
// pick it up (it lights up), then click a square one step diagonally away.

const N = 4;
const CELL = 80;
let tr = 3, tc = 0;       // the token's row and column
let picked = false;

function setup() {
  new Canvas(N * CELL, N * CELL);
}

function draw() {
  if (mouse.presses()) {
    const c = floor(mouse.x / CELL);
    const r = floor(mouse.y / CELL);
    if (r === tr && c === tc) picked = true;
    else if (picked && abs(r - tr) === 1 && abs(c - tc) === 1) {
      tr = r;
      tc = c;
      picked = false;
    }
  }
  noStroke();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
      rect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  if (picked) {
    fill('rgba(255, 215, 0, 0.45)');
    rect(tc * CELL, tr * CELL, CELL, CELL);
  }
  fill('tomato');
  circle(tc * CELL + CELL / 2, tr * CELL + CELL / 2, CELL * 0.6);
}
