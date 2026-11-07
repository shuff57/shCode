// 6.3.3 Lab: Slow it, stop it, count it.
let cue, shots = 0;

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
  text('Shots ' + shots, 12, 24);
  if (mouse.pressing()) {
    stroke('white');
    line(cue.x, cue.y, mouse.x, mouse.y);
    noStroke();
  }
  // STEP 1: drag, stop rule, a shot from rest, and the count.
  if (mouse.released()) {
    const power = min(dist(cue.x, cue.y, mouse.x, mouse.y), 120);
    cue.direction = cue.angleTo(mouse.x, mouse.y) + 180;
    cue.speed = power / 12;
  }
}
