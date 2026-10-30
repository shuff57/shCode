// 5.3.4 Lab: Build the table.

let ball, goal, score;

function setup() {
  new Canvas(400, 400);

  // STEP 1: turn gravity on, so the ball falls.

  // STEP 2: build at least three static obstacles for the ball to bounce off.
  //   Give each one a name, like bumper, so the code can reach it later.

  // STEP 3: build a ball that falls, and make it genuinely bouncy.

  // STEP 4: build a gold goal block somewhere the ball could reach.

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  textSize(22);
  text('score: ' + score, 20, 60);

  if (kb.presses('r')) {
    ball.x = 200;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
