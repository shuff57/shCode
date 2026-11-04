// 5.13.4 Lab: Steer it.

const CELL = 20;
let head, dx, dy, playing;

function cellToPixel(n) {
  return n * CELL + CELL / 2;
}

function setup() {
  new Canvas(400, 400);
  head = new Sprite(cellToPixel(10), cellToPixel(10), CELL - 2, CELL - 2, 'static');
  head.color = 'limegreen';
  head.col = 10;
  head.row = 10;
  dx = 1;
  dy = 0;
  playing = true;
}

function draw() {
  background('#222');

  // STEP 1: when an arrow key is pressed, set dx and dy (up is dx = 0, dy = -1).
  // STEP 2: only allow up/down when dy === 0, and left/right when dx === 0.

  if (playing && frameCount % 8 === 0) {
    head.col += dx;
    head.row += dy;
    // STEP 3: if the new column or row is off the grid (below 0, or 20 or
    //   more), set playing to false. Otherwise (else), move the block on
    //   screen with the two lines below, so a dead block stays on its last cell.
    head.x = cellToPixel(head.col);
    head.y = cellToPixel(head.row);
  }
}

// drawTop() runs after the sprites are drawn, so the block can never cover
// its words (the same trick as the Flappy labs, from 5.11.1).
function drawTop() {
  fill('white');
  textSize(14);
  text('arrow keys steer', 20, 28);
  if (!playing) text('Game over', 150, 200);
}
