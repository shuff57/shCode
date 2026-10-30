// 5.3.8 Lab: Three bumpers, three values (reference solution).

let ball, floor, score;
let bumpers = [];

function setup() {
  new Canvas(440, 420);
  world.gravity.y = 10;

  const b1 = new Sprite(110, 150, 110, 14, 'static');
  b1.color = 'sienna';
  b1.rotation = -18;
  b1.worth = 1;
  b1.wasTouching = false;

  const b2 = new Sprite(330, 150, 110, 14, 'static');
  b2.color = 'sienna';
  b2.rotation = 18;
  b2.worth = 5;
  b2.wasTouching = false;

  const b3 = new Sprite(220, 265, 130, 14, 'static');
  b3.color = 'sienna';
  b3.worth = 10;
  b3.wasTouching = false;

  bumpers.push(b1, b2, b3);

  floor = new Sprite(220, 405, 440, 20, 'static');
  floor.color = 'gray';

  ball = new Sprite(220, 40, 22);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 26);
  textSize(22);
  text('score: ' + score, 20, 58);

  for (const b of bumpers) {
    const touching = ball.colliding(b);
    if (touching && !b.wasTouching) {
      score += b.worth;
    }
    b.wasTouching = touching;
  }

  if (kb.presses('r')) {
    ball.x = 220;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
