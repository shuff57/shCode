// 5.3.12 Challenges: Make it yours (reference: all three).

let ball, bumper, floor, goal, goal2, score, best, wasTouching, playing;
let wasTouching2 = false;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  bumper = new Sprite(200, 160, 140, 16, 'static');
  bumper.color = 'sienna';
  bumper.rotation = -12;

  // Challenge 2: a bumper that slides, so it is dynamic rather than static.
  const slider = new Sprite(200, 300, 60, 12);
  slider.color = 'purple';
  slider.bounciness = 0.2;
  slider.vel.x = 3;

  floor = new Sprite(200, 385, 400, 20, 'static');
  floor.color = 'gray';

  goal = new Sprite(330, 250, 60, 60, 'static');
  goal.color = 'gold';
  goal.worth = 1;

  // Challenge 1: a second goal, worth more.
  goal2 = new Sprite(70, 250, 50, 50, 'static');
  goal2.color = 'orange';
  goal2.worth = 5;

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.9;

  score = 0;
  best = 0;
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
    textSize(14);
    text('best: ' + best, 20, 84);

    const touching = ball.colliding(goal);
    if (touching && !wasTouching) score += goal.worth;
    wasTouching = touching;

    const touching2 = ball.colliding(goal2);
    if (touching2 && !wasTouching2) score += goal2.worth;
    wasTouching2 = touching2;

    // Challenge 3: the best score survives a restart.
    if (score > best) best = score;

    if (ball.y > 400) playing = false;
  } else {
    textSize(22);
    text('Game over', 20, 160);
    textSize(14);
    text('score: ' + score, 20, 190);
    text('best: ' + best, 20, 215);
    text('press R to play again', 20, 240);
  }

  if (kb.presses('r')) {
    playing = true;
    score = 0;
    wasTouching = false;
    wasTouching2 = false;
    ball.x = 200;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
