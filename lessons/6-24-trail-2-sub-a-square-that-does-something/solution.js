// Sub-build: a square that does something. Six squares in a row; SPACE steps
// the token one square. Landing on J jumps it ahead 2, landing on S sends it
// back to the start. The letter decides.

const ROW = '.J..S.';
let at = 0;
let note = '';

function setup() {
  new Canvas(400, 160);
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('space') && at < ROW.length - 1) {
    at += 1;
    note = '';
    if (ROW[at] === 'J') { at = min(at + 2, ROW.length - 1); note = 'jumped ahead 2'; }
    else if (ROW[at] === 'S') { at = 0; note = 'back to the start'; }
  }
  for (let i = 0; i < ROW.length; i++) {
    fill(ROW[i] === '.' ? '#2d3045' : '#2e7d4f');
    rect(20 + i * 60, 60, 56, 56, 6);
    if (ROW[i] !== '.') text(ROW[i], 42 + i * 60, 94, 16, 'white');
  }
  fill('tomato');
  circle(48 + at * 60, 104, 16);
}

function drawTop() {
  text('Square ' + at + '  ' + note, 20, 30, 16, 'white');
}
