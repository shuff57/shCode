// 5.3.10 Lab: Lose, and start again (reference solution).

let ball, bumper, floor, goal, score, wasTouching, playing;

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
  playing = true;
}

function draw() {
  background('#222');
  fill('white');

  if (playing) {
    textSize(14);
    text('press R to drop the ball', 20, 28);
    textSize(22);
    text('score: ' + score, 20, 60);

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
    ball.x = 200;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
