// 5.2.13 A5.2.1 Pinball Scene: gravity, obstacles, a bouncy ball, a reset key.

let ball;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  const bumperTop = new Sprite(120, 120, 80, 16, 'static');
  bumperTop.color = 'sienna';
  bumperTop.rotation = -20;

  const bumperMid = new Sprite(280, 220, 80, 16, 'static');
  bumperMid.color = 'sienna';
  bumperMid.rotation = 20;

  const floor = new Sprite(200, 380, 400, 20, 'static');
  floor.color = 'gray';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.9;
}

function draw() {
  background('#222');

  if (kb.presses('r')) {
    ball.x = 200;
    ball.y = 40;
  }
}
