// 6.1.3 Sub-build: An aim line.
let cue;

function setup() {
  new Canvas(400, 400);
  cue = new Sprite(200, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
}

function draw() {
  background('green');
  // STEP 1: while the button is held, draw a line from the ball to the pointer.
  // STEP 2: show how far the pull is.
}
