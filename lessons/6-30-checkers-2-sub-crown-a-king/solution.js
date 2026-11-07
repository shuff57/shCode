// Sub-build: crown a king. A red token steps up the board one diagonal at a
// time (click it, then click the square). On the top row it becomes 'R', a
// king, which may also step back down.

const N = 4;
const CELL = 80;
let piece = 'r';          // 'r', or 'R' once it is a king
let pr = 3, pc = 0;
let picked = false;

function setup() {
  new Canvas(N * CELL, N * CELL);
}

function draw() {
  if (mouse.presses()) {
    const c = floor(mouse.x / CELL);
    const r = floor(mouse.y / CELL);
    const up = r === pr - 1;
    const down = r === pr + 1;
    if (r === pr && c === pc) picked = true;
    else if (picked && abs(c - pc) === 1 && (up || (down && piece === 'R'))) {
      pr = r;
      pc = c;
      picked = false;
      if (pr === 0) piece = 'R';
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
    rect(pc * CELL, pr * CELL, CELL, CELL);
  }
  fill('tomato');
  circle(pc * CELL + CELL / 2, pr * CELL + CELL / 2, CELL * 0.6);
  if (piece === 'R') text('K', pc * CELL + CELL / 2 - 6, pr * CELL + CELL / 2 + 7, 20, 'gold');
}
