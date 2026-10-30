// 5.5.8 Lab: Don't bite yourself.

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

function isBody(col, row) {
  // STEP 1: look through segments for one sitting on (col, row).
  //   Return true the moment you find one, and false if the loop ends.
  return false;
}

function step() {
  const head = segments[0];
  const col = head.col + dx;
  const row = head.row + dy;
  // STEP 2: the round also ends when (col, row) is already part of the body.
  //   Use isBody(col, row) in the same test that checks the walls.
  if (col < 0 || col >= 20 || row < 0 || row >= 20) {
    playing = false;
    return;
  }

  segments.unshift(makeSegment(col, row));
  if (col === food.col && row === food.row) {
    score += 1;
    food.delete();
    food = makeFood();
  } else {
    const tail = segments.pop();
    tail.delete();
  }
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
