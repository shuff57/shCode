// 5.11.2 Lab: Pipes that come and go.

let bird, pipes;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 20;

  bird = new Sprite(100, 200, 24);
  bird.color = 'gold';

  pipes = [];
}

// Builds one pair of pipes just off the right edge, with a gap of 130 at a random height.
function makePipe() {
  const gapY = random(120, 280);
  const topH = gapY - 65;
  const botH = 400 - (gapY + 65);
  const top = new Sprite(440, topH / 2, 50, topH, 'kinematic');
  const bottom = new Sprite(440, 400 - botH / 2, 50, botH, 'kinematic');
  top.color = 'forestgreen';
  bottom.color = 'forestgreen';
  top.vel.x = -2;
  bottom.vel.x = -2;
  top.mate = bottom;
  top.passed = false;
  return top;
}

function draw() {
  background('#222');

  // The bird's x never changes: the pipes do the moving. Holding it here every
  // frame means a pipe that bumps the bird cannot shove it off the screen.
  bird.x = 100;
  bird.vel.x = 0;

  if (kb.presses(' ')) {
    bird.vel.y = -4;
  }
  if (bird.y > 400 || bird.y < 0) {
    bird.y = 200;
    bird.vel.y = 0;
  }

  // STEP 1: every 90 frames, build a pair and push it into pipes.
  //   Right now only one pair is ever built:
  if (frameCount === 1) {
    pipes.push(makePipe());
  }

  // STEP 2: loop over pipes from the end to the start. When pipes[i].x < -30,
  //   delete its mate, delete it, and splice it out of the array.
}

// drawTop() runs after the sprites are drawn, so its text is never hidden behind a pipe.
function drawTop() {
  fill('white');
  textSize(14);
  text('tap space to flap', 20, 28);

  // STEP 3: draw how many pipes are alive.
}
