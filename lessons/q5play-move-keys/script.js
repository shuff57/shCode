/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.1.4 Make it Move — arrow keys drive a sprite around.
// Uncomment each STEP and fill in the code.

let player;

function setup() {
  // STEP 1: Canvas + no gravity + a sprite in the middle
  //   new Canvas(400, 400);
  //   world.gravity.y = 0;
  //   player = new Sprite(200, 200, 40, 40);
  //   player.color = 'deepskyblue';
}

function update() {
  // STEP 2: Horizontal movement — left/right arrows set player.vel.x
  //   if (kb.pressing('left'))       player.vel.x = -4;
  //   else if (kb.pressing('right')) player.vel.x =  4;
  //   else                           player.vel.x =  0;

  // STEP 3: Vertical movement — up/down arrows set player.vel.y
  //   if (kb.pressing('up'))         player.vel.y = -4;
  //   else if (kb.pressing('down'))  player.vel.y =  4;
  //   else                           player.vel.y =  0;
}

function draw() {
  // STEP 4: Clear the background so old frames don't pile up
  //   background('#111');
}
