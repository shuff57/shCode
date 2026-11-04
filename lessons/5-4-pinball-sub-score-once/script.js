// 5.4.3 Sub-build: Score once.
// One ball, one bumper, one number. The ball bounces; the score never moves.

let ball, bumper, score = 0;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  bumper = new Sprite(200, 230, 260, 16, 'static');
  bumper.color = 'sienna';

  ball = new Sprite(200, 60, 26);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.8;
}

function draw() {
  background('white');
  textSize(18);
  text('Score ' + score, 12, 24);

  // STEP 1: store this frame's answer in a variable.

  // STEP 2: remember the frame before, and score only when a touch starts.

  // STEP 3: give the memory this frame's answer.
}
