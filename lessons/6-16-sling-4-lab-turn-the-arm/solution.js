// 6.16.4 Lab: Turn the arm (reference solution).
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
  arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);
}
