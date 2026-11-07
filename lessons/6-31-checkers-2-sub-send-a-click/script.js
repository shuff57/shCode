// 6.31.2 Sub-build: Send a click.
// H hosts a room; to join, put the code in JOIN and run. A click sends the
// square you clicked; every click, yours too, arrives in onMove, and the square
// is marked in the sender's colour on both computers.

const N = 4;
const CELL = 80;
const TOP = 40;
const JOIN = '';          // the host's room code, e.g. 'K7QX2M'
let marks = [];           // every square that has arrived: { r, c, seat }

function setup() {
  new Canvas(N * CELL, TOP + N * CELL);
  // STEP: every move that arrives goes into marks, with the seat that sent it.
  // Then join a room when JOIN has a code.
}

function draw() {
  background('#1b1d2a');
  // STEP: H hosts a room. Once the room is ready, a click on the board sends its row and column.
  noStroke();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
      rect(c * CELL, TOP + r * CELL, CELL, CELL);
    }
  }
  for (const m of marks) {
    fill(m.seat === 0 ? 'tomato' : '#262626');
    circle(m.c * CELL + CELL / 2, TOP + m.r * CELL + CELL / 2, CELL * 0.5);
  }
}

function drawTop() {
  if (online.status === 'off') text('Press H to host, or put a code in JOIN and Run', 10, 26, 12, 'white');
  else if (online.status === 'error') text(('' + online.error).slice(0, 44), 10, 26, 12, 'tomato');
  else if (online.status === 'waiting' || online.status === 'ready') {
    text('Room code: ' + online.code, 10, 28, 18, 'gold');
    text(online.status + ', seat ' + online.seat, 205, 28, 12, 'white');
  }
  else text('Room: ' + online.status, 10, 26, 14, 'white');
}
