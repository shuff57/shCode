// 2.7.26 A17.1 Two-Player Pong-Sumo: two players, one ball, first to 5.

let gameState;
let p1, p2, ball;
const WIN_SCORE = 5;

function setup() {
  // STEP 1: Create a canvas (try 600×400) and turn off gravity so sprites glide

  // STEP 2: Create two static wall sprites along the top and bottom edges

  // STEP 3: Create p1 (paddle on the left) and p2 (paddle on the right)
  //         Set a bounciness value on each so the ball bounces off cleanly

  // STEP 4: Create ball in the center with an initial horizontal velocity
  //         Set a bounciness value on the ball too

  // STEP 5: Add at least one joint somewhere in the arena: a fixed-length joint
  //         between two sprites, or a pivot joint on an obstacle.
  //         Tip: set the joint's length after you create it, not inside the constructor.

  // STEP 6: Declare two score variables (one per player), initialize both to 0,
  //         and set gameState to start on the title screen
}

function draw() {
  // STEP 7: switch(gameState) with cases for 'title', 'play', and 'win'
  //   case 'title':  Show the game name and a prompt; listen for a keypress to start
  //   case 'play':   Move paddles with kb.pressing: different keys for each player
  //                  Check if the ball crossed the left or right edge to score
  //                  Reset the ball to the center after each score
  //                  Render both scores on screen with text()
  //                  Check whether either score has hit the winning number
  //                  and switch to the win state when it does
  //   case 'win':    Show the winner; listen for a keypress to reset and return to title
}
