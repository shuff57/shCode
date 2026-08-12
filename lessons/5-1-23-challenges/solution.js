// 2.1.11 Challenges (reference solution).
// Demonstrates Challenge 1 (color cycle on tap), Challenge 2 (orbiting
// companion), and Challenge 4 (frameCount HUD). Any one of the six
// challenges is enough to pass the grader.

let player, companion;
let palette = ['deepskyblue', 'hotpink', 'orange', 'limegreen'];
let colorIdx = 0;

function setup() {
  new Canvas(500, 400);

  player = new Sprite(250, 200, 36, 36);
  player.color = palette[colorIdx];

  companion = new Sprite(310, 200, 18, 18);
  companion.color = 'white';
  companion.collider = 'none';
}

function draw() {
  background('#222');

  // Player — WASD with else-to-zero.
  if      (kb.pressing('a')) player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x =  3;
  else                       player.vel.x =  0;
  if      (kb.pressing('w')) player.vel.y = -3;
  else if (kb.pressing('s')) player.vel.y =  3;
  else                       player.vel.y =  0;

  // Challenge 1 — kb.presses fires once per tap, so the color advances by
  // one per keypress instead of 60 times per second.
  if (kb.presses('a') || kb.presses('d') || kb.presses('w') || kb.presses('s')) {
    colorIdx = (colorIdx + 1) % palette.length;
    player.color = palette[colorIdx];
  }

  // Challenge 2 — companion orbits the player using sin + cos.
  companion.x = player.x + cos(frameCount * 0.05) * 60;
  companion.y = player.y + sin(frameCount * 0.05) * 60;

  // Challenge 4 — HUD with frameCount and rounded position.
  fill(255);
  textSize(14);
  text('Frame: ' + frameCount, 12, 20);
  text('Player: (' + Math.round(player.x) + ', ' + Math.round(player.y) + ')', 12, 38);
}
