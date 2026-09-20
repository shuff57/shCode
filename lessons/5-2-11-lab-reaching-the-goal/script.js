// 5.2.11 Lab: Reaching the Goal: a single-fire win check with delete().

let player, ground, goal;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';
  player.bounciness = 0.6;

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
  ground.friction = 0.5;

  goal = new Sprite(360, 340, 24, 24);
  goal.collider = 'none';
  goal.color = 'gold';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -8;
  }

  if (player.y < 200) {
    player.applyForce(0, -3);
  }

  // STEP 1: Check whether the player has reached the goal, but only while
  //         `goal` still exists (guard the whole block with if (goal) so
  //         it can only fire once). Compute the distance between the
  //         player and the goal (dx, dy, then the Pythagorean distance).
  //         When that distance is small enough, log a win message, call
  //         goal.delete(), and set `goal` to null so the check can never
  //         run again.
}
