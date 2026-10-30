// 5.5.6 Lab: Grow and eat (reference solution).

const CELL = 20;
let segments, food, dx, dy, score, playing;

// New since 5.5.4: the snake is an array, segments, with the head at
// segments[0]. Every function below is finished except step(), and step()
// is where all of your work goes.

// Turns a column or row number into the pixel at the middle of that cell.
function cellToPixel(n) {
  return n * CELL + CELL / 2;
}

// Builds one green cell of the body at (col, row) and gives it back.
// The sprite remembers its own cell in .col and .row.
function makeSegment(col, row) {
  const s = new Sprite(cellToPixel(col), cellToPixel(row), CELL - 2, CELL - 2, 'static');
  s.color = 'limegreen';
  s.col = col;
  s.row = row;
  return s;
}

// Builds one red food cell at a random spot and gives it back.
function makeFood() {
  const col = floor(random(20));
  const row = floor(random(20));
  const f = new Sprite(cellToPixel(col), cellToPixel(row), CELL - 6, CELL - 6, 'static');
  f.color = 'crimson';
  f.col = col;
  f.row = row;
  return f;
}

// One move of the snake, run on the beat. This is the move from 5.5.4's
// draw(), now in a function of its own: work out the next cell, stop at a wall.
function step() {
  const head = segments[0];
  const col = head.col + dx;
  const row = head.row + dy;
  if (col < 0 || col >= 20 || row < 0 || row >= 20) {
    playing = false;
    return;   // return ends step() here: nothing below it runs
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

// Clears the old snake and food, then builds a three-cell snake, new food,
// and a fresh direction, score and flag. setup() and the R key both use it.
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
