// 5.2.22 Lab: Rules in update(), picture in draw().
// The jump scene from 5.2.10, with everything in draw(). Split it in two.

let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
}

// STEP 1: add an empty update() function here, below setup().

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('a and d move, space jumps', 20, 26);

  // STEP 2: move these three lines (the keys and the movement) into update().
  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  // STEP 3: move the jump into update() too.
  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -7;
  }
}
