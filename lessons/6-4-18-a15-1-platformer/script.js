// 2.4.10 A15.1 Side-Scrolling Platformer
// Open the Quest tab for the graded requirements; open the Docs tab for the moSHion API.

let player, goal;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  // STEP 1: Create the player sprite with an initial visual — either
  // addAni('idle', ...) or sprite.image = '🧍'.

  // STEP 2: Build a level wider than the canvas. Add a ground sprite plus
  // at least three static platforms (pass 'static' as the 5th constructor
  // argument). Spread them across an x-range wider than 400.

  // STEP 3: Place a goal sprite far to the right. Give it
  // sprite.collider = 'none' so it doesn't physically push the player.

}

function draw() {
  // STEP 4: Clear the background each frame so old drawings don't pile up.

  // STEP 5: Read WASD with kb.pressing. Drive the player horizontally AND
  // swap its visual based on motion (run vs idle, or two addAni states).

  // STEP 6: Use kb.presses('w') AND player.colliding(allSprites) together
  // to jump only when the player is touching the ground or a platform.

  // STEP 7: Make the camera follow — assign camera.x from player.x every
  // frame. Hard follow is fine; lerp smoothing is a stretch.

  // STEP 8: Goal overlap -> win message. See the s8 step in the Quest tab
  // for the API to use; place the call inside this draw() body.

}
