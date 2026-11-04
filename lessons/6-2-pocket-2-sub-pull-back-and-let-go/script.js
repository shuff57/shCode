// 6.2.2 Sub-build: Pull back and let go.
let cue;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(200, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
}

function draw() {
  background('green');
  // STEP 1: on release, set the direction away from the pointer.
  // STEP 2: set the speed from the pull, with a ceiling.
}
