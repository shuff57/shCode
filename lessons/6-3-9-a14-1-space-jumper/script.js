// 2.3.20 A14.1 Space Jumper
// Open the Quest tab for the graded requirements; open the Docs tab for the moSHion API.

let player, ground, goal;

function setup() {
  new Canvas(600, 400);

  // STEP 1: Enable gravity (world.gravity.y), then create a static ground
  // sprite and a dynamic player sprite.

  // STEP 4: Add a goal sprite somewhere reachable for the win check.

}

function draw() {
  background('#222');

  // STEP 2: WASD horizontal: drive the player's x velocity from the
//         held-key check, using the a and d keys.
  // Else-to-zero when neither is held.

  // STEP 3: Ground-gated jump: combine the edge-triggered space check with
  //         a ground contact test, so the player can only jump when landed.
  // Use a LITERAL space character as the key arg: the string 'space' is not
  // recognized by moSHion. The contact test returns the frame count while in contact.

  // STEP 4: Win condition: when player overlaps the goal, trigger a clear
  // win state (change background, stop updating, show text, etc).

}
