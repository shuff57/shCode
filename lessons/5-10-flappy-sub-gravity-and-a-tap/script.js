// 5.10.4 Sub-build: Gravity and a tap.
// The bird falls to the ground. No key does anything yet.

let bird, ground;

function setup() {
  new Canvas(400, 400);
  ground = new Sprite(200, 390, 400, 20, 'static');
  ground.color = 'gray';
  bird = new Sprite(120, 120, 26);
  bird.color = 'gold';
  // STEP 1: turn gravity on for the whole world.
}

function draw() {
  background('skyblue');
  // STEP 2: on Space, send the bird up.
}
