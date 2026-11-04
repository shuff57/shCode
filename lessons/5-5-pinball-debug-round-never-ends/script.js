// 5.5.4 Debugging: The round that never ends (starter, with both bugs).
let ball, score = 0;
let playing = true;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  ball = new Sprite(200, 60, 24);
  ball.color = 'deepskyblue';
}

function draw() {
  background('white');
  if (ball.y > height) {
    playing = false;
  }

  // BUG 1: this runs whether the round is live or not.
  ball.vel.x = 2;

  if (kb.presses('r')) {
    ball.x = 200;
    ball.y = 60;
    ball.vel.x = 0;
    ball.vel.y = 0;
    score = 0;
    // BUG 2: the round is never set running again.
  }

  if (!playing) text('Game over', 150, 150);
}
