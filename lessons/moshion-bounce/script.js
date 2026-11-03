// 5.2.12 Bouncy Ball: build a closed box and drop a ball in it.

let ball;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10; // gravity pulls down the screen (5.2.6)

  // STEP 1: Build four static walls: top, bottom, left and right, so the
  //         ball cannot escape. Each is a long thin static sprite; give
  //         them a colour so you can see them.

  // STEP 2: Create the ball as a dynamic sprite. One size argument (its
  //         diameter) instead of two makes it a circle. Store it in `ball`
  //         and colour it, then give it a sideways kick with ball.vel.x so
  //         it travels rather than dropping straight down.

  // STEP 3: Make it bouncy. The property runs 0 (sticky) to 1 (perfectly
  //         elastic): pick something near the top of that range.

  // STEP 4: Give it a friction. Try 0 first, then 5, and watch how it
  //         rolls versus drags.
}

function draw() {
  background('#111'); // clear the screen every frame
}
