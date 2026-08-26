// 2.4.5 Animated Sprites Sandbox: swap a sprite's visual when its state changes.
// (The canonical form is addAni('idle', ...) + changeAni('run') with art assets.
//  Here we use sprite.image swapping with emoji placeholders: same pattern,
//  no asset hosting required.)

let player;

function setup() {
  new Canvas(400, 300);

  // STEP 1: Create the player sprite. Give it an idle visual by assigning
  // sprite.image (or sprite.img) to an emoji string: e.g. '🧍'.

}

function draw() {
  // STEP 2: Clear the background each frame so old drawings don't pile up.

  // STEP 3: Read WASD with kb.pressing('a' / 'd' / 'w'). Set the player's
  // horizontal motion (vel.x or x +=) based on which key is held.

  // STEP 4: Swap the player's visual based on the same input.
  // While moving, switch sprite.image to a 'run' emoji (e.g. '🏃').
  // While 'w' is held, switch to a 'jump' emoji (e.g. '🤸').
  // Otherwise, switch back to the idle emoji from STEP 1.

}
