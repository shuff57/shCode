// 5.3.6 Lab: Score one point per touch (reference solution).

let ball, bumper, floor, goal, score, wasTouching;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  bumper = new Sprite(200, 160, 140, 16, 'static');
  bumper.color = 'sienna';
  bumper.rotation = -12;

  floor = new Sprite(200, 385, 400, 20, 'static');
  floor.color = 'gray';

  goal = new Sprite(330, 250, 60, 60, 'static');
  goal.color = 'gold';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.9;

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
  if (touching && !wasTouching) {
    score += 1;
  }
  wasTouching = touching;

  if (kb.presses('r')) {
    ball.x = 200;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
