// 5.12.1 Sub-build: Score once per pipe (reference solution).
let bird, pipes = [], score = 0;

function setup() {
  new Canvas(400, 400);
  bird = new Sprite(90, 200, 24);
  bird.color = 'gold';
  bird.collider = 'none';

  const p = new Sprite(300, 200, 60, 130, 'static');
  p.color = 'green';
  p.vel.x = -2;
  pipes.push(p);
}

function draw() {
  background('skyblue');
  textSize(18);
  text('Score ' + score, 12, 24);

  for (const p of pipes) {
    if (bird.x > p.x && !p.passed) {
      score += 1;
      p.passed = true;
    }
  }
}
