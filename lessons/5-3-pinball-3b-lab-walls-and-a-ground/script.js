// 5.3.7 Lab: Walls and a ground.

let ball, bumper, ground, goal, score;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  // STEP 1: build two tall static walls, one at each side of the canvas.
  //   Put them above the ball's lines.

  // STEP 2: build a static ground along the bottom, stored in ground.
  //   Leave a gap at the left: that gap is the drain.

  ball = new Sprite(70, 60, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;

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
