// 6.1.3 Sub-build: An aim line (reference solution).
let cue;

function setup() {
  new Canvas(400, 400);
  cue = new Sprite(200, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
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
