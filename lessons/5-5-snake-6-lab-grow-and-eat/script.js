// 5.5.6 Lab: Grow and eat.

const CELL = 20;
let segments, food, dx, dy, score, playing;

function cellToPixel(n) {
  return n * CELL + CELL / 2;
}

function makeSegment(col, row) {
  const s = new Sprite(cellToPixel(col), cellToPixel(row), CELL - 2, CELL - 2, 'static');
  s.color = 'limegreen';
  s.col = col;
  s.row = row;
  return s;
}

function makeFood() {
  const col = floor(random(20));
  const row = floor(random(20));
  const f = new Sprite(cellToPixel(col), cellToPixel(row), CELL - 6, CELL - 6, 'static');
  f.color = 'crimson';
  f.col = col;
  f.row = row;
  return f;
}

function step() {
  const head = segments[0];
  const col = head.col + dx;
  const row = head.row + dy;
  if (col < 0 || col >= 20 || row < 0 || row >= 20) {
    playing = false;
    return;
  }

  // STEP 1: right now the snake is one cell that is deleted and rebuilt ahead.
  //   Grow a body instead: add a new head with segments.unshift(...), and
  //   remove the tail with segments.pop() (delete the sprite you get back).
  // STEP 2: when the new head's cell is the food's cell (col === food.col and
  //   row === food.row), add 1 to score, delete the food and make a new one,
  //   and do NOT remove the tail that step.
  segments[0].delete();
  segments[0] = makeSegment(col, row);
}

function startRound() {
  for (const s of segments) s.delete();
  if (food) food.delete();
  segments = [];
  for (let i = 0; i < 3; i++) segments.push(makeSegment(10 - i, 10));
  food = makeFood();
  dx = 1;
  dy = 0;
  score = 0;
  playing = true;
}

function setup() {
  new Canvas(400, 400);
  segments = [];
  startRound();
}

function draw() {
  background('#222');
  fill('white');
  textSize(22);
  text('score: ' + score, 20, 32);

  if (kb.presses('up') && dy === 0) { dx = 0; dy = -1; }
  if (kb.presses('down') && dy === 0) { dx = 0; dy = 1; }
  if (kb.presses('left') && dx === 0) { dx = -1; dy = 0; }
  if (kb.presses('right') && dx === 0) { dx = 1; dy = 0; }

  if (playing && frameCount % 8 === 0) step();

  if (!playing) {
    textSize(28);
    text('Game over', 130, 190);
    textSize(14);
    text('press R to play again', 130, 215);
  }
  if (kb.presses('r')) startRound();
}
