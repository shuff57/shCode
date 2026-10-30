// 5.5.8 Lab: Don't bite yourself (reference solution).

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
  let col = floor(random(20));
  let row = floor(random(20));
  while (isBody(col, row)) {
    col = floor(random(20));
    row = floor(random(20));
  }
  const f = new Sprite(cellToPixel(col), cellToPixel(row), CELL - 6, CELL - 6, 'static');
  f.color = 'crimson';
  f.col = col;
  f.row = row;
  return f;
}

function isBody(col, row) {
  for (const s of segments) {
    if (s.col === col && s.row === row) return true;
  }
  return false;
}

function step() {
  const head = segments[0];
  const col = head.col + dx;
  const row = head.row + dy;
  if (col < 0 || col >= 20 || row < 0 || row >= 20 || isBody(col, row)) {
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

  if (kb.presses('up') && dy === 0) { dx = 0; dy = -1; }
  if (kb.presses('down') && dy === 0) { dx = 0; dy = 1; }
  if (kb.presses('left') && dx === 0) { dx = -1; dy = 0; }
  if (kb.presses('right') && dx === 0) { dx = 1; dy = 0; }

  if (playing && frameCount % 8 === 0) step();

  if (kb.presses('r')) startRound();
}

// drawTop() runs after the sprites are drawn, so the snake can never cover
// its words (the same trick as the Flappy labs, from 5.4.5).
function drawTop() {
  fill('white');
  textSize(22);
  text('score: ' + score, 20, 32);

  if (!playing) {
    textSize(28);
    text('Game over', 130, 190);
    textSize(14);
    text('press R to play again', 130, 215);
  }
}
