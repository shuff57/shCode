// 5.3.10 Lab: Lose, and start again.

let ball, bumper, floor, goal, score, wasTouching;

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

  // the floor stops short of the left wall: that gap is the drain
  floor = new Sprite(250, 385, 280, 20, 'static');
  floor.color = 'gray';

  goal = new Sprite(286, 151, 100, 14, 'static');
  goal.color = 'gold';
  goal.rotation = 14;

  ball = new Sprite(70, 60, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;

  score = 0;
  wasTouching = false;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  textSize(22);
  text('score: ' + score, 20, 60);

  const touching = ball.colliding(goal);
  if (touching && !wasTouching) score += 1;
  wasTouching = touching;

  // STEP 1: the round has no end and no state. Add a flag that says whether
  //   the game is being played.
  // STEP 2: when the ball falls past the bottom of the canvas, end the round.

  if (kb.presses('r')) {
    // STEP 3: starting a round over means putting the SCORE back too.
    ball.x = 70;
    ball.y = 60;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
