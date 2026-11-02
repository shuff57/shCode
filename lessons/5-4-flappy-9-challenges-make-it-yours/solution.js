// 5.4.11 Challenges: Make it yours (reference solution: harder as you go, a best score, a random wobble).

let bird, pipes, score, playing, best;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 20;

  bird = new Sprite(100, 200, 24);
  bird.color = 'gold';

  pipes = [];
  score = 0;
  best = 0;
  playing = true;
}

// Builds one pair of pipes just off the right edge, with a gap of 130 at a random height.
function makePipe() {
  const gapY = random(120, 280);
  const speed = 2 + min(score / 5, 3);   // faster as the score grows
  const topH = gapY - 65;
  const botH = 400 - (gapY + 65);
  const top = new Sprite(440, topH / 2, 50, topH, 'kinematic');
  const bottom = new Sprite(440, 400 - botH / 2, 50, botH, 'kinematic');
  top.color = 'forestgreen';
  bottom.color = 'forestgreen';
  top.vel.x = -speed;
  bottom.vel.x = -speed;
  top.mate = bottom;
  top.passed = false;
  top.wobble = random(0.3, 0.7);   // random again: how fast this pipe's gap bobs
  top.vel.y = top.wobble;          // both halves move by the same amount,
  bottom.vel.y = top.wobble;       // so the gap keeps its size
  return top;
}

function endRound() {
  playing = false;
  if (score > best) best = score;
  world.gravity.y = 0;
  bird.vel.y = 0;
  for (const q of pipes) {
    q.vel.x = 0;
    q.mate.vel.x = 0;
    q.vel.y = 0;
    q.mate.vel.y = 0;
  }
}

function startRound() {
  for (const p of pipes) {
    p.mate.delete();
    p.delete();
  }
  pipes = [];
  bird.y = 200;
  bird.vel.y = 0;
  world.gravity.y = 20;
  score = 0;
  playing = true;
}

function draw() {
  background('#222');

  // The bird's x never changes: the pipes do the moving. Holding it here every
  // frame means a pipe that bumps the bird cannot shove it off the screen.
  bird.x = 100;
  bird.vel.x = 0;

  if (playing) {
    if (kb.presses(' ')) bird.vel.y = -4;
    if (bird.y > 400 || bird.y < 0) {
      bird.y = 200;
      bird.vel.y = 0;
    }
    if (frameCount % 90 === 0) pipes.push(makePipe());

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
      if (frameCount % 30 === 0) {   // on a beat, turn the wobble the other way
        p.vel.y = -p.vel.y;
        p.mate.vel.y = p.vel.y;
      }
      if (bird.colliding(p) || bird.colliding(p.mate)) endRound();
    }
  }

  if (kb.presses('r')) startRound();
}

// drawTop() runs after the sprites are drawn, so its text is never hidden behind a pipe.
function drawTop() {
  fill('white');
  textSize(22);
  text('score: ' + score, 20, 36);
  textSize(14);
  text('best: ' + best, 20, 56);

  if (!playing) {
    textSize(28);
    text('Game over', 130, 190);
  }
}
