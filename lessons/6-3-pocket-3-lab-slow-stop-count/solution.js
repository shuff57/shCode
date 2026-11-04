// 6.3.3 Lab: Slow it, stop it, count it (reference solution).
let cue, shots = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(200, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
  const wall = new Walls();
  wall.color = 'brown';
  cue.drag = 0.02;
}

function draw() {
  background('green');
  text('Shots ' + shots, 12, 24);
  if (cue.speed < 0.2) {
    cue.speed = 0;
  }
  if (mouse.pressing()) {
    stroke('white');
    line(cue.x, cue.y, mouse.x, mouse.y);
    noStroke();
    text(round(dist(cue.x, cue.y, mouse.x, mouse.y)), 12, 44);
  }
  if (mouse.released() && cue.speed === 0) {
    const power = min(dist(cue.x, cue.y, mouse.x, mouse.y), 120);
    cue.direction = cue.angleTo(mouse.x, mouse.y) + 180;
    cue.speed = power / 12;
    shots += 1;
  }
}
