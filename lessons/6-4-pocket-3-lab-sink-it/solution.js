// 6.4.4 Lab: Sink it (reference solution).
let cue, pocket, sunk = false;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(100, 200, 22);
  cue.collider = 'dynamic';
  cue.color = 'white';
  cue.drag = 1;
  const walls = new Walls();
  pocket = new Sprite(330, 300, 34, 34, 'static');
  pocket.color = 'black';
  pocket.collider = 'none';
}

function draw() {
  background('green');
  if (cue.speed < 0.2) cue.speed = 0;
  if (mouse.pressing() && !sunk) {
    stroke('white');
    line(cue.x, cue.y, mouse.x, mouse.y);
    noStroke();
  }
  if (mouse.released() && cue.speed === 0 && !sunk) {
    const power = min(dist(cue.x, cue.y, mouse.x, mouse.y), 120);
    cue.direction = cue.angleTo(mouse.x, mouse.y) + 180;
    cue.speed = power / 12;
  }
  if (cue.overlaps(pocket) && cue.speed < 1 && !sunk) {
    cue.speed = 0;
    cue.x = pocket.x;
    cue.y = pocket.y;
    sunk = true;
    text('Pocketed', 160, 200);
  }
}
