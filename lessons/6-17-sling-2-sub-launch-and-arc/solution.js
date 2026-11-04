// 6.17.2 Sub-build: Launch and arc (reference solution).
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

  if (mouse.released()) {
    const shot = new Sprite(arm.x + 40, arm.y - 20, 18);
    shot.color = 'gray';
    shot.direction = arm.rotation;
    shot.speed = 9;
    shots.push(shot);
  }
}
