// 6.25.2 Sub-build: Send and receive one number.
// H hosts a room and shows its code; to join, put the host's code in JOIN and run.
// SPACE sends a random number; every number sent, yours too, should arrive in onMove.

const JOIN = '';          // the host's room code, e.g. 'BHKE'
let got = [];             // every number that has arrived, in order

function setup() {
  new Canvas(400, 200);
  // STEP: when a move arrives, push seat + ':' + move.n onto got.
  // STEP: if JOIN is not empty, join that room.
}

function draw() {
  background('#1b1d2a');
  // STEP: H hosts a room (only while online.status is 'off').
  // STEP: SPACE sends { n: a random number } (only while online.status is 'ready').
}

function drawTop() {
  if (online.status === 'off') text('Press H to host, or put a code in JOIN and Run', 10, 24, 16, 'white');
  else text('Status: ' + online.status + '   Room: ' + (online.code || '...'), 10, 24, 16, 'white');
  if (online.status === 'waiting' || online.status === 'ready') text('You are seat ' + online.seat, 10, 48, 16, 'gold');
  if (online.status === 'error') text(('' + online.error).slice(0, 60), 10, 180, 12, 'tomato');
  text(got.join('  '), 10, 90, 16, 'white');
}
