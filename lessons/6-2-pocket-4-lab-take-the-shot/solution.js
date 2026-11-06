// 6.2.4 Lab: Take the shot (reference solution).
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
  }
  if (mouse.released()) {
    const power = min(dist(cue.x, cue.y, mouse.x, mouse.y), 120);
    cue.direction = cue.angleTo(mouse.x, mouse.y) + 180;
    cue.speed = power / 12;
  }
}
