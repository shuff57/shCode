// 6.16.3 Sub-build: The arm turns (reference solution).
let arm;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;
  arm = new Sprite(120, 240, 90, 12);
  arm.collider = 'none';
  arm.color = 'sienna';
}

function draw() {
  background('skyblue');
  arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);
}
