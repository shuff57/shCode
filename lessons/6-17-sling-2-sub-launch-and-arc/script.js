// 6.17.2 Sub-build: Launch and arc.
let arm, shots = [];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  arm = new Sprite(100, 230, 80, 12);
  arm.collider = 'none';
  arm.color = 'sienna';
}

function draw() {
  background('skyblue');
  arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);
  // STEP: on release, make a stone at the arm and launch it along the arm.
}
