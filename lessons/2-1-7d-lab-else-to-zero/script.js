// 2.1.7d Lab — Delete the else, watch drift.

// This lab ships with a COMPLETE, WORKING movement pattern.
// Your job is NOT to write code from scratch — it is to experiment.

let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  // STEP 1: Click Run. Hold a WASD key — sprite moves. Release — it stops.
  //         Confirm the else lines are doing their job.

  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;
  else                       player.vel.x =  0;   // ← STEP 2: delete this line, rerun

  if      (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y =  4;
  else                       player.vel.y =  0;   // ← STEP 2: delete this line too, rerun

  // STEP 3: Tap a key once and release — watch the sprite drift off-screen.
  //         vel.x (or vel.y) was set by a keypress and never cleared.

  // STEP 4: Put both else lines back exactly as they were.
  //         The grader checks that both are present before you can submit.
}
