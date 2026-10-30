// 5.5.4 Lab: Steer it (reference solution).

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

  if (kb.presses('up') && dy === 0) { dx = 0; dy = -1; }
  if (kb.presses('down') && dy === 0) { dx = 0; dy = 1; }
  if (kb.presses('left') && dx === 0) { dx = -1; dy = 0; }
  if (kb.presses('right') && dx === 0) { dx = 1; dy = 0; }

  if (playing && frameCount % 8 === 0) {
    head.col += dx;
    head.row += dy;
    if (head.col < 0 || head.col >= 20 || head.row < 0 || head.row >= 20) {
      playing = false;
    } else {
      head.x = cellToPixel(head.col);
      head.y = cellToPixel(head.row);
    }
  }
}

// drawTop() runs after the sprites are drawn, so the block can never cover
// its words (the same trick as the Flappy labs, from 5.4.5).
function drawTop() {
  fill('white');
  textSize(14);
  text('arrow keys steer', 20, 28);
  if (!playing) text('Game over', 150, 200);
}
