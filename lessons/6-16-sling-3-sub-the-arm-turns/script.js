// 6.16.3 Sub-build: The arm turns.
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
  // STEP 1: point the arm at the pointer.
  // STEP 2: keep it out of the ground.
}
