// 6.10.9 Lab: Win or lose (reference solution).

const WALL = [          // the wall, as rows of text: # is a brick, . is a gap
  '########',
  '########',
  '##.##.##',
  '########',
  '.######.',
];
const BRICK_ROWS = WALL.length;      // 5
const BRICK_COLS = WALL[0].length;   // 8
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];
const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
let paddle, ball;
let vx, vy;             // the ball's speed: pixels per frame across, and down
let score, lives;
let state;              // 'play', 'won' or 'lost'
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';
  ball.color = 'white';
  startGame();
}

// A new game: a whole wall, no points, three balls, and the first serve.
function startGame() {
  bricks = makeBricks();
  score = 0;
  lives = 3;
  state = 'play';
  serve();
}

// Put the ball back above the paddle, heading up and to the right.
function serve() {
  ball.x = 200;
  ball.y = 300;
  vx = 3;
  vy = -4;
}

function draw() {
  background('#111');
  if (state === 'play') {
    movePaddle();
    moveBall();
    hitBricks();
    checkEnd();
  } else if (kb.presses('r')) {
    startGame();
  }
  drawBricks();
}

function movePaddle() {
  if (control === 'mouse') {
    paddle.x = mouse.x;
  }
  if (control === 'keys') {
    if (kb.pressing('left')) paddle.x -= 6;
    if (kb.pressing('right')) paddle.x += 6;
  }
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
}

function moveBall() {
  ball.x += vx;
  ball.y += vy;
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
  }
}

// Read the wall from WALL: a 1 for every #, a 0 for every gap.
function makeBricks() {
  const b = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      if (WALL[r][c] === '#') row.push(1);
      else row.push(0);
    }
    b.push(row);
  }
  return b;
}

// Draw a rectangle for every cell that holds a 1, in its row's colour.
function drawBricks() {
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) {
        fill(ROW_COLORS[r]);
        rect(c * BW, TOP + r * BH, BW, BH);
      }
    }
  }
}

// Your hitAt from 6.9.11: when a brick is at pixel (x, y), take it out and say true.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    score += 10;
    return true;
  }
  return false;
}

// Did the ball hit a brick? Test its edges, and send it back the right way.
function hitBricks() {
  if (hitAt(ball.x, ball.y - R) || hitAt(ball.x, ball.y + R)) vy = -vy;
  if (hitAt(ball.x - R, ball.y) || hitAt(ball.x + R, ball.y)) vx = -vx;
}

// How many bricks are still standing?
function bricksLeft() {
  let n = 0;
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) n += 1;
    }
  }
  return n;
}

// Has the ball been lost, or the wall cleared?
function checkEnd() {
  if (ball.y > 400 + R) {
    lives -= 1;
    if (lives === 0) state = 'lost';
    else serve();
  }
  if (bricksLeft() === 0) state = 'won';
}

function drawTop() {
  fill('white');
  textSize(16);
  text('score: ' + score, 12, 24);
  text('bricks left: ' + bricksLeft(), 140, 24);
  text('lives: ' + lives, 320, 24);
  if (state === 'won') text('You cleared the wall! Press R', 85, 260);
  if (state === 'lost') text('Out of balls. Press R', 115, 260);
}
