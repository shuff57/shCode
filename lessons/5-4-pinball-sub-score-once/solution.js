// 5.4.3 Sub-build: Score once (reference solution).
let ball, bumper, score = 0;
let wasTouching = false;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  bumper = new Sprite(200, 230, 260, 16, 'static');
  bumper.color = 'sienna';

  ball = new Sprite(200, 60, 26);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.8;
}

function draw() {
  background('white');
  textSize(18);
  text('Score ' + score, 12, 24);

  const touching = ball.colliding(bumper) > 0;
  if (touching && !wasTouching) {
    score += 1;
  }
  wasTouching = touching;
}
