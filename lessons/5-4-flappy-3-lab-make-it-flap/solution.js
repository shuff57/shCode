// 5.10.5 Lab: Make it flap (reference solution).

let bird;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 20;

  bird = new Sprite(100, 200, 24);
  bird.color = 'gold';
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('tap space to flap', 20, 28);

  if (kb.presses(' ')) {
    bird.vel.y = -4;
  }

  if (bird.y > 400 || bird.y < 0) {
    bird.y = 200;
    bird.vel.y = 0;
  }
}
