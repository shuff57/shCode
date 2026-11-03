// 6.10.5 Lab: Bounce (reference solution).

const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let paddle, ball;
let vx, vy;             // the ball's speed: pixels per frame across, and down
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';   // nothing pushes it: your code moves it
  ball.color = 'white';
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

// Move the ball one step, and bounce it off the walls and the paddle.
function moveBall() {
  ball.x += vx;
  ball.y += vy;
  if (ball.x < R && vx < 0) vx = -vx;
  if (ball.x > 400 - R && vx > 0) vx = -vx;
  if (ball.y < R) vy = -vy;
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
  }
  if (ball.y > 400 + R) serve();
}

function drawTop() {
  fill('white');
  textSize(16);
  text('vx: ' + round(vx, 1) + '   vy: ' + vy, 12, 24);
}
