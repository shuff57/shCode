// 6.16.4 Lab: Turn the arm.
let base, arm;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;
  base = new Sprite(120, 250, 80, 20, 'static');
  base.color = 'gray';
  arm = new Sprite(120, 200, 90, 12);
  arm.collider = 'none';
  arm.color = 'sienna';
}

function draw() {
  background('skyblue');
  // STEP: aim the arm at the pointer, out of the ground.
}
