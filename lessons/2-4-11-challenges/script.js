function setup() {
  // STEP 1: Build your foreground level (platforms, ground tile, player sprite)

  // STEP 2: (Challenge 1) Create a clouds array and push parallax background sprites
  //         into it — use c.layer = -10 and c.collider = 'none'

  // STEP 3: (Challenge 3) Build a tall level — stack platforms vertically
  //         so the player must climb upward to test camera.y follow
}

function draw() {
  background('#224');

  // STEP 4: Handle player input (kb.pressing 'a'/'d' for horizontal movement,
  //         'space' or 'w' for jump)

  // STEP 5: Follow the player horizontally
  //         camera.x = lerp(camera.x, player.x, 0.1);

  // STEP 6: (Challenge 1) Re-position each cloud using its base x plus a fraction
  //         of camera.x to create the parallax depth effect

  // STEP 7: (Challenge 2) Flip player.scale.x to -1 when moving left, 1 when moving right

  // STEP 8: (Challenge 3) Add vertical camera follow — use a small lerp factor
  //         (e.g. 0.05) so jumps don't shake the camera
  //         camera.y = lerp(camera.y, player.y, 0.05);
}
