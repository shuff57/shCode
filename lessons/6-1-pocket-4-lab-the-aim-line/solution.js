// 6.1.4 Lab: The aim line on the table (reference solution).
let cue;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(200, 200, 22);
  cue.collider = 'dynamic';
  cue.color = 'white';
  const walls = new Walls();
}

function draw() {
  background('green');
  if (mouse.pressing()) {
    stroke('white');
    line(cue.x, cue.y, mouse.x, mouse.y);
    noStroke();
    text(round(dist(cue.x, cue.y, mouse.x, mouse.y)), 12, 24);
  }
}
