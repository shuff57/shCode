// 6.4.3 Lab: Sink it.
let cue, pocket, sunk = false;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(100, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
  cue.drag = 0.02;
  const wall = new Walls();
  wall.color = 'brown';
  pocket = new Sprite(330, 300, 34, 34, 'static');
  pocket.color = 'black';
}

function draw() {
  background('green');
  if (cue.speed < 0.2) cue.speed = 0;
  if (mouse.pressing()) {
    stroke('white');
    line(cue.x, cue.y, mouse.x, mouse.y);
    noStroke();
  }
  if (mouse.released() && cue.speed === 0) {
    const power = min(dist(cue.x, cue.y, mouse.x, mouse.y), 120);
    cue.direction = cue.angleTo(mouse.x, mouse.y) + 180;
    cue.speed = power / 12;
  }
  // STEP: the pocket is pass-through, drops a slow ball once, and says so.
}
