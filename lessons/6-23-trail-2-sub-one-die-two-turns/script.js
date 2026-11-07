// 6.23.2 Sub-build: One die, two turns.
// SPACE rolls a number from 1 to 6; each roll passes the turn to the other player.

let roll = 0;
let turn = 0;             // 0 or 1: whose turn it is
const NAMES = ['Red', 'Blue'];

function setup() {
  new Canvas(300, 160);
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('space')) {
    // STEP: roll a number from 1 to 6 into roll, then pass the turn.
  }
}

function drawTop() {
  text('Last roll: ' + roll, 20, 60, 24, 'white');
  text(NAMES[turn] + "'s turn: press SPACE", 20, 110, 18, 'gold');
}
