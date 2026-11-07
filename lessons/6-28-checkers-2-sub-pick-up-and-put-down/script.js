// 6.28.2 Sub-build: Pick up and put down.
// One token on a 4 by 4 board. Click it to pick it up (it lights up), then
// click a square one step diagonally away.

const N = 4;
const CELL = 80;
let pr = 3, pc = 0;       // the token's row and column
let picked = false;

function setup() {
  new Canvas(N * CELL, N * CELL);
}

function draw() {
  if (mouse.presses()) {
    // STEP: turn the click into a row r and a column c. A click on the token picks
    // it up; once it is picked up, a click one square diagonally away moves it there.
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
    rect(pc * CELL, pr * CELL, CELL, CELL);
  }
  fill('tomato');
  circle(pc * CELL + CELL / 2, pr * CELL + CELL / 2, CELL * 0.6);
}
