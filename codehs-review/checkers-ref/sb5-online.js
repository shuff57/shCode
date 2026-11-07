// Sub-build: send a click. H hosts a room; to join, put the code in JOIN and
// run. A click sends the square you clicked; every click, yours too, arrives
// in onMove, and the square is marked in the sender's colour on both computers.

const N = 4;
const CELL = 80;
const TOP = 40;
const JOIN = '';          // the host's room code, e.g. 'K7QX2M'
let marks = [];           // every square that has arrived: { r, c, seat }

function setup() {
  new Canvas(N * CELL, TOP + N * CELL);
  online.onMove((m, seat) => {
    marks.push({ r: m.r, c: m.c, seat: seat });
  });
  if (JOIN !== '') online.join(JOIN);
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('h') && online.status === 'off') online.host();
  if (mouse.presses() && online.status === 'ready') {
    const c = floor(mouse.x / CELL);
    const r = floor((mouse.y - TOP) / CELL);
    if (r >= 0 && r < N && c >= 0 && c < N) online.send({ r: r, c: c });
  }
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
  else text('Room ' + (online.code || '...') + '   ' + online.status + '   seat ' + online.seat, 10, 26, 14, 'white');
}
