// 6.10.4 Lab: The paddle.

const PADDLE_W = 80;    // the paddle is 80 pixels wide

let paddle;
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
}

function draw() {
  background('#111');
  movePaddle();
}

// Move the paddle by the mouse or by the arrow keys, then keep it on the screen.
function movePaddle() {
  // STEP 1: when control is 'mouse', put the paddle's x where the mouse's x
  //   is.
  // STEP 2: when control is 'keys', the left arrow moves the paddle 6 pixels
  //   left and the right arrow 6 pixels right.
  // STEP 3: keep the paddle on the screen: its x may not go below half its
  //   width, or above 400 minus half its width.
}

function drawTop() {
  fill('white');
  textSize(16);
  text('control: ' + control, 12, 24);
  text('paddle x: ' + round(paddle.x), 12, 48);
}
