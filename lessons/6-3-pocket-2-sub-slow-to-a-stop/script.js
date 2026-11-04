// 6.3.2 Sub-build: Slow to a stop.
let cue;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(200, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
  cue.speed = 6;
  cue.direction = 20;
  // STEP 1: give the ball drag.
}

function draw() {
  background('green');
  text('speed ' + round(cue.speed, 1), 12, 24);
  // STEP 2: call it stopped under a small speed.
}
