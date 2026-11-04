// 5.5.2 Sub-build: End and start again.
// The ball drops through the gap and falls for ever. Nothing ends; R does nothing.

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

  // STEP 1: end the round when the ball is below the canvas.
  // STEP 2: restart it on R.
  if (playing) {
    score += 0;
  } else {
    text('Game over', 150, 150);
  }
}
