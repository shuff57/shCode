// 5.11.2 Sub-build: Spawn and recycle.
// One pipe sits on the right and never moves.

let pipes = [];

function setup() {
  new Canvas(400, 400);
  const p = new Sprite(430, 200, 60, 120, 'static');
  p.color = 'green';
  pipes.push(p);

  // STEP 1: every 90 frames, make another pipe at the right edge and push it.
}

function draw() {
  background('skyblue');
  // STEP 2: remove pipes that have left the screen, from the screen and the list.
}
