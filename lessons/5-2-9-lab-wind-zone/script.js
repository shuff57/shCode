// 5.2.9 Lab: Wind Zone: push the player with applyForce inside a zone.

let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';
  player.bounciness = 0.6;

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
  ground.friction = 0.5;
}

function draw() {
  background('#222');

  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -8;
  }

  // STEP 1: Add a wind zone above y = 200. When the player's y position
  //         is less than 200, call applyForce on the player with an
  //         upward force (a negative y value) so it pushes back against
  //         gravity instead of overriding the fall outright.
}
