// 5.4.8 Lab: Crash, and start again.

let bird, pipes, score;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 20;

  bird = new Sprite(100, 200, 24);
  bird.color = 'gold';

  pipes = [];
  score = 0;
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
  fill('white');
  textSize(22);
  text('score: ' + score, 20, 36);

  if (kb.presses(' ')) {
    bird.vel.y = -4;
  }
  if (bird.y > 400 || bird.y < 0) {
    bird.y = 200;
    bird.vel.y = 0;
  }

  if (frameCount % 90 === 0) {
    pipes.push(makePipe());
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    if (pipes[i].x < -30) {
      pipes[i].mate.delete();
      pipes[i].delete();
      pipes.splice(i, 1);
    }
  }

  for (const p of pipes) {
    if (p.x < bird.x && !p.passed) {
      score += 1;
      p.passed = true;
    }
    // STEP 1: if the bird is colliding with p or p.mate, the round is over.
    // STEP 2: in the same place, freeze the world (gravity, bird, every pipe).
  }

  // STEP 3: when R is pressed, put back everything a round owns, including
  //   the pipes. Then draw 'Game over' while the flag is false.
}
