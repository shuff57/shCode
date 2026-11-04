// 6.17.4 Lab: Launch!
let base, arm, shots = [];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  base = new Sprite(100, 250, 80, 20, 'static');
  base.color = 'gray';
  arm = new Sprite(100, 210, 80, 12);
  arm.collider = 'none';
  arm.color = 'sienna';
}

function draw() {
  background('skyblue');
  arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);
  // STEP: fire on release, along the arm.
}
