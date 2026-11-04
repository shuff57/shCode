// 6.2.4 Lab: Take the shot.
let cue;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(200, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
  const wall = new Walls();
  wall.color = 'brown';
}

function draw() {
  background('green');
  // STEP 1: the aim line while held.
  // STEP 2: on release, shoot away from the pointer with capped power.
}
