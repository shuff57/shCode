// 5.5.2 Sub-build: End and start again (reference solution).
let ball, score = 0;
let playing = true;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  const left = new Sprite(60, 220, 120, 14, 'static');
  left.color = 'gray';
  const right = new Sprite(340, 220, 120, 14, 'static');
  right.color = 'gray';

  ball = new Sprite(200, 60, 24);
  ball.color = 'deepskyblue';
}

function draw() {
  background('white');
  textSize(18);
  text('Score ' + score, 12, 24);

  if (ball.y > height) {
    playing = false;
  }

  if (kb.presses('r')) {
    ball.x = 200;
    ball.y = 60;
    ball.vel.x = 0;
    ball.vel.y = 0;
    score = 0;
    playing = true;
  }

  if (!playing) {
    text('Game over', 150, 150);
  }
}
