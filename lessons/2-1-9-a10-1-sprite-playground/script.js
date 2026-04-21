// 2.1.9 A10.1 — Sprite Playground
// Build in this file. The requirements panel shows what the auto-grader checks for.

let player;
let mover;

function setup() {
  new Canvas(500, 400);

  // TODO: create the controllable player sprite (any position, size, color)
  player = new Sprite(100, 200, 40, 40);
  player.color = 'deepskyblue';

  // TODO: create the mover sprite that will animate on its own
  mover = new Sprite(400, 200, 30, 30);
  mover.color = 'orange';
}

function draw() {
  background('#222');

  // TODO: WASD movement for player — remember else-to-zero!
  if (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else player.vel.x = 0;

  // TODO: add vertical movement (w / s) here

  // TODO: make the mover move on its own using frameCount
  // Example: mover.pos.x = 400 + sin(frameCount * 0.05) * 80;

  // TODO: add an on-screen text label at the top
  // Hint: textSize(18); fill(255); text('Your message', 20, 30);
}
