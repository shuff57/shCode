// 5.10.4 Sub-build: Gravity and a tap (reference solution).
let bird, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  ground = new Sprite(200, 390, 400, 20, 'static');
  ground.color = 'gray';
  bird = new Sprite(120, 120, 26);
  bird.color = 'gold';
}

function draw() {
  background('skyblue');
  if (kb.presses('space')) {
    bird.vel.y = -5;
  }
}
