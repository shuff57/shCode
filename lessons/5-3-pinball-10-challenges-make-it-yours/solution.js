// 5.3.12 Challenges: Make it yours (reference: all three).
// My rules: a second goal worth 5, a bumper that slides, and a best score
// that survives R. Without the best score, every restart would forget it.

let ball, bumper, ground, goal, goal2, slider, score, best, wasTouching, playing;
let wasTouching2 = false;
let slideStep = 2;

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
  goal.worth = 1;

  // Challenge 1: a second goal, worth more, on the ball's way to the drain.
  goal2 = new Sprite(330, 250, 40, 40, 'static');
  goal2.color = 'orange';
  goal2.worth = 5;

  // Challenge 2: a bumper that slides, across the arc the ball makes on its way
  // back to the left. It stays static, so gravity leaves it alone, and draw()
  // moves it a little every frame.
  slider = new Sprite(160, 250, 60, 12, 'static');
  slider.color = 'purple';

  ball = new Sprite(70, 60, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;

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
    text('score: ' + score, 250, 60);
    textSize(14);
    text('best: ' + best, 250, 84);

    slider.x += slideStep;
    if (slider.x > 190 || slider.x < 130) slideStep = -slideStep;

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
    ball.x = 70;
    ball.y = 60;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
