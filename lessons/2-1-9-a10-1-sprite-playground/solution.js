// 2.1.9 Sprite Playground (reference solution).
// Canvas + WASD player + frameCount-driven mover + on-screen text.

let player, mover;

function setup() {
  new Canvas(500, 400);
  player = new Sprite(250, 200, 40, 40);
  player.color = 'deepskyblue';
  mover = new Sprite(80, 200, 30, 30);
  mover.color = 'orange';
}

function draw() {
  background('#222');

  // Player — WASD with else-to-zero so it stops cleanly.
  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;
  else                       player.vel.x =  0;
  if      (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y =  4;
  else                       player.vel.y =  0;

  // Mover — frameCount drives a small horizontal oscillation.
  mover.x = 80 + Math.sin(frameCount * 0.05) * 60;

  // Label.
  fill(255);
  textSize(14);
  text('WASD to move the blue sprite', 12, 24);
}
