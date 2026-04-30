// 2.5.20 A16.2 Game States — add a state machine to your W15 game.

// STEP 1: At the top level (above setup), declare your state variable:
//   let gameState = 'menu';
// This is the single variable that controls which part of the game runs.

function setup() {
  // Bring your W15 game's setup code here (canvas, sprites, world, etc.).
  // No graded steps in setup — the state machine lives entirely in draw().
}

function draw() {
  // STEP 2: Add switch (gameState) here so each frame routes to one case.

  // STEP 3: Inside the switch, add three named cases — case 'menu',
  // case 'play', and at least one end state (case 'win' or case 'lose').

  // STEP 4: In case 'menu', use kb.presses(...) to set gameState = 'play'
  // when the player wants to start.

  // STEP 5: In case 'play', detect a win/lose condition (score, lives, etc.)
  // and set gameState = 'win' or gameState = 'lose'.

  // STEP 6: In case 'win' or case 'lose', let the player set
  // gameState = 'menu' to return to the start screen.
}
