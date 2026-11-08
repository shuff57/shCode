// Sub-build: send an action. H hosts a room; to join, put the code in JOIN
// and run. Keys 1, 2 and 3 send that action; every action, yours too, arrives
// in onMove in the same order on both computers.

const JOIN = '';          // the host's room code, e.g. 'BHKE'
const NAMES = ['', 'attack', 'guard', 'potion'];
let got = [];             // every action that has arrived

function setup() {
  new Canvas(400, 200);
  online.onMove((m, seat) => {
    if ([1, 2, 3].includes(m.act)) got.push('seat ' + seat + ': ' + NAMES[m.act]);
  });
  if (JOIN !== '') online.join(JOIN);
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('h') && online.status === 'off') online.host();
  if (online.status === 'ready') {
    if (kb.presses('1')) online.send({ act: 1 });
    if (kb.presses('2')) online.send({ act: 2 });
    if (kb.presses('3')) online.send({ act: 3 });
  }
}

function drawTop() {
  if (online.status === 'off') text('Press H to host, or put a code in JOIN and Run', 10, 24, 12, 'white');
  if (online.status === 'waiting') text('Room code: ' + online.code, 10, 28, 18, 'gold');
  if (online.status === 'ready') text('Ready: you are seat ' + online.seat, 10, 24, 14, 'gold');
  if (online.status === 'error') text(('' + online.error).slice(0, 50), 10, 24, 12, 'tomato');
  if (online.status === 'connecting' || online.status === 'closed') text('Room: ' + online.status, 10, 24, 14, 'white');
  for (let i = 0; i < got.length && i < 6; i++) text(got[got.length - 1 - i], 10, 60 + i * 20, 14, 'white');
}
