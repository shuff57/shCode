// 5.1.23 Sprite Playground: combine canvas, WASD movement, auto-motion, and text.

let player, mover;

function setup() {
  // STEP 1: Create the canvas (any size from 300×300 to 800×600), then create
  // two sprites: `player`, which you control with WASD, and `mover`, which
  // moves on its own.

}

function draw() {
  // STEP 5: Clear the background each frame so old frames don't stack up.

  // STEP 2: Wire WASD to the player: read kb.pressing for 'a' / 'd' / 'w' / 's'
  // and set player.vel.x / player.vel.y. End each chain (one for vel.x, one
  // for vel.y) with an else that resets it to 0, so the player stops when no
  // key is held.

  // STEP 3: Make the mover move on its own, with no key held: work it out
  // from frameCount (swing, circle or spin, as in 5.1.22), or nudge it a
  // little every frame.

  // STEP 4: Draw an on-screen text label using text() and textSize(). Set fill()
  // before text() so the label is visible on the background.

}
