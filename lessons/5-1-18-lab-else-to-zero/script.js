// 5.1.19 Lab: Delete the else, watch drift.

// This lab ships with a WORKING movement pattern: each chain ends in an
// `else` line that sets the velocity back to 0. You will break it on
// purpose, watch what goes wrong, then fix it and make the speed your own.

let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  // STEP 1: Click Run, hold a WASD key, then let go: the sprite stops.
  // STEP 2: Delete the two lines `else player.vel.x = 0;` and
  //         `else player.vel.y = 0;` below, then click Run again.
  // STEP 3: Tap a WASD key once and watch the sprite drift: vel.x (or
  //         vel.y) was set by the keypress and is never cleared.
  // STEP 4: Put both `else` lines back where they were, then change the 4s
  //         and -4s to a speed of your own from 2 to 6.

  if (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else player.vel.x = 0;

  if (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y = 4;
  else player.vel.y = 0;
}
