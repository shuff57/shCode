// 2.3.20 A14.1 Space Jumper
// Build a one-sprite platformer with gravity, WASD movement, ground-gated
// jumping, and a win condition. Open the Quest tab for the graded
// requirements; open the Docs tab for the q5play API.

let player, ground, goal;

function setup() {
  new Canvas(600, 400);

  // STEP 1: Enable gravity, create the dynamic player and the static ground.
  //   world.gravity.y = 20;
  //   ground = new Sprite(300, 380, 600, 20, 'static');
  //   player = new Sprite(80, 300, 30, 30);

  // STEP 4: Add a goal sprite somewhere reachable for the win check.
  //   goal = new Sprite(560, 350, 24, 24, 'static');
  //   goal.color = 'gold';
}

function draw() {
  background('#222');

  // STEP 2: WASD horizontal — set player.vel.x from kb.pressing('a' / 'd').
  //   if (kb.pressing('a'))      player.vel.x = -4;
  //   else if (kb.pressing('d')) player.vel.x = 4;
  //   else                       player.vel.x = 0;

  // STEP 3: Ground-gated jump — kb.presses('space') AND player.touching(ground).
  //   if (kb.presses('space') && player.touching(ground)) {
  //     player.vel.y = -12;
  //   }

  // STEP 4: Win condition — when player overlaps the goal, trigger a clear
  // win state (change background, stop updating, etc).
  //   if (player.overlaps(goal)) {
  //     // your win response
  //   }
}
