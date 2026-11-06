// 5.3.4 Lab: Drop a bouncy ball.

let ball, bumper, ground, goal, score;

function setup() {
  new Canvas(400, 400);

  // STEP 1: turn gravity on, so things fall.

  // STEP 2: build a ball that falls, and make it genuinely bouncy.
  //   Start it at (70, 60): that is where the R key below puts it back.

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  textSize(22);
  text('score: ' + score, 250, 60);

  if (kb.presses('r')) {
    ball.x = 70;
    ball.y = 60;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
