// 6.10.6 Lab: A wall from text.

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
let score;
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';
  ball.color = 'white';
  bricks = makeBricks();
  score = 0;
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
  movePaddle();
  moveBall();
  hitBricks();
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
  if (ball.y > 400 + R) serve();
}

// Read the wall from WALL: a 1 for every #, a 0 for every gap.
function makeBricks() {
  const b = [];
  // STEP 1: build the wall from WALL. For each of BRICK_ROWS rows make an
  //   empty row; for each of BRICK_COLS letters push 1 when WALL[r][c] is the
  //   letter #, and 0 when it is not; then push the row onto b.
  return b;
}

// Draw a rectangle for every cell that holds a 1, in its row's colour.
function drawBricks() {
  // STEP 2: draw the wall from the data. Two loops over every cell: where the
  //   cell is 1, fill with ROW_COLORS[r] and draw a rect at the brick's
  //   top-left corner, BW wide and BH tall.
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

// Did the ball hit a brick? If it did, send it back the other way.
function hitBricks() {
  // STEP 3: ask hitAt about the ball's centre. If it says true, flip vy so
  //   the ball goes back the other way.
}

function drawTop() {
  fill('white');
  textSize(16);
  text('score: ' + score, 12, 24);
}
