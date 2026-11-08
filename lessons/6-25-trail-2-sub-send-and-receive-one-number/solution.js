// Sub-build: send and receive one number. H hosts a room and shows its code;
// to join, put the host's code in JOIN and run. SPACE sends a random number;
// every number sent, yours too, arrives in onMove in the same order.

const JOIN = '';          // the host's room code, e.g. 'BHKE'
let got = [];             // every number that has arrived, in order

function setup() {
  new Canvas(400, 200);
  online.onMove((move, seat) => {
    got.push(seat + ':' + move.n);
  });
  if (JOIN !== '') online.join(JOIN);
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('h') && online.status === 'off') online.host();
  if (kb.presses('space') && online.status === 'ready') online.send({ n: floor(random(1, 100)) });
}

function drawTop() {
  if (online.status === 'off') text('Press H to host, or put a code in JOIN and Run', 10, 24, 16, 'white');
  else text('Status: ' + online.status + '   Room: ' + (online.code || '...'), 10, 24, 16, 'white');
  if (online.status === 'waiting' || online.status === 'ready') text('You are seat ' + online.seat, 10, 48, 16, 'gold');
  if (online.status === 'error') text(('' + online.error).slice(0, 60), 10, 180, 12, 'tomato');
  text(got.join('  '), 10, 90, 16, 'white');
}
