// 5.3.9 Lab: Put a goal on the table.

let ball, bumper, ground, goal, score;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  // two walls keep the ball on the table
  const leftWall = new Sprite(5, 200, 10, 400, 'static');
  leftWall.color = 'gray';
  const rightWall = new Sprite(395, 200, 10, 400, 'static');
  rightWall.color = 'gray';

  bumper = new Sprite(140, 115, 200, 14, 'static');
  bumper.color = 'sienna';
  bumper.rotation = 14;

  // the ground stops short of the left wall: that gap is the drain
  ground = new Sprite(250, 385, 280, 20, 'static');
  ground.color = 'gray';

  // STEP 1: run it and watch where the ball rolls after the bumper.

  // STEP 2: build a gold goal block there, stored in goal.
  //   Give it the same body type as the bumper, and the same tilt.

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
