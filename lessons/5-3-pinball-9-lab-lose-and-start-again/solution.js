// 5.5.2 Lab: Lose, and start again (reference solution).

let ball, bumper, ground, goal, score, wasTouching, playing;

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

  goal = new Sprite(286, 151, 100, 14, 'static');
  goal.color = 'gold';
  goal.rotation = 14;

  ball = new Sprite(70, 60, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;

  score = 0;
  wasTouching = false;
  playing = true;
}

function draw() {
  background('#222');
  fill('white');

  if (playing) {
    textSize(14);
    text('press R to drop the ball', 20, 28);
    textSize(22);
    text('score: ' + score, 250, 60);

    const touching = ball.colliding(goal);
    if (touching && !wasTouching) score += 1;
    wasTouching = touching;

    if (ball.y > 400) playing = false;
  } else {
    textSize(22);
    text('Game over', 20, 160);
    textSize(14);
    text('score: ' + score, 20, 190);
    text('press R to play again', 20, 220);
  }

  if (kb.presses('r')) {
    playing = true;
    score = 0;
    wasTouching = false;
    ball.x = 70;
    ball.y = 60;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
