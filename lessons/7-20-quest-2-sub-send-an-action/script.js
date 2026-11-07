// 7.20.2 Sub-build: Send an action.
// H hosts a room; to join, put the code in JOIN and run. Keys 1, 2 and 3 will
// send that action; every action, yours too, arrives in onMove in the same
// order on both computers.

const JOIN = '';          // the host's room code, e.g. 'K7QX2M'
const NAMES = ['', 'attack', 'guard', 'potion'];
let got = [];             // every action that has arrived

function setup() {
  new Canvas(400, 200);
  // STEP: every action that arrives goes into got, with the seat that sent it.
  // Then join a room when JOIN has a code.
}

function draw() {
  background('#1b1d2a');
  // STEP: H hosts a room. Once the room is ready, 1, 2 and 3 send that action.
}

function drawTop() {
  if (online.status === 'off') text('Press H to host, or put a code in JOIN and Run', 10, 24, 12, 'white');
  if (online.status === 'waiting') text('Room code: ' + online.code, 10, 28, 18, 'gold');
  if (online.status === 'ready') text('Ready: you are seat ' + online.seat, 10, 24, 14, 'gold');
  if (online.status === 'error') text(('' + online.error).slice(0, 50), 10, 24, 12, 'tomato');
  if (online.status === 'connecting' || online.status === 'closed') text('Room: ' + online.status, 10, 24, 14, 'white');
  for (let i = 0; i < got.length && i < 6; i++) text(got[got.length - 1 - i], 10, 60 + i * 20, 14, 'white');
}
