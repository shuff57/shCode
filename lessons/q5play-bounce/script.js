/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.2.1 Bouncy Ball — build a closed box and drop a ball in it.
// Uncomment each STEP and fill in the code.

let ball;

function setup() {
  new Canvas(400, 400);

  // STEP 1: Turn on gravity
  //   world.gravity.y = 10;

  // STEP 2: Build four static walls — top, bottom, left, right
  //   new Sprite(200, 10, 400, 20, 'static').color = '#444';
  //   new Sprite(200, 390, 400, 20, 'static').color = '#444';
  //   new Sprite(10, 200, 20, 400, 'static').color = '#444';
  //   new Sprite(390, 200, 20, 400, 'static').color = '#444';

  // STEP 3: Create a dynamic ball — one size argument makes it a circle
  //   ball = new Sprite(200, 100, 30);
  //   ball.color = 'orange';

  // STEP 4: Make it bouncy (0 = sticky, 1 = perfectly elastic)
  //   ball.bounciness = 0.9;

  // STEP 5: Low friction so it doesn't drag to a stop
  //   ball.friction = 0;

  // STEP 6: Give it a starting horizontal kick
  //   ball.vel.x = 4;
}

function draw() {
  // STEP 7: Clear the background
  //   background('#111');
}
