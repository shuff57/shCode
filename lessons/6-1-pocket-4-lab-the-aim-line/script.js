// 6.1.4 Lab: The aim line on the table.
let cue;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(200, 200, 22);
  cue.collider = 'dynamic';
  cue.color = 'white';
  // STEP: the four rails, after the canvas.
}

function draw() {
  background('green');
  // STEP: the aim line, while the pointer is held.
}
