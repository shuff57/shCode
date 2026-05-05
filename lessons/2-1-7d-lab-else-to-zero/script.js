// 2.1.7d Lab — Delete the else, watch drift.

// This lab ships with a BROKEN movement pattern — both `else` lines that reset
// velocity to 0 are missing. The auto-grader checks that you put them back.

let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  // STEP 1: Click Run as-is. Tap a WASD key once and watch the sprite drift —
  //         vel.x (or vel.y) was set by a keypress and is never cleared.

  // STEP 2: Add the missing `else player.vel.x = 0;` and
  //         `else player.vel.y = 0;` lines below so the sprite stops when no
  //         key is held. The grader checks for both.

  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;

  if      (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y =  4;
}
