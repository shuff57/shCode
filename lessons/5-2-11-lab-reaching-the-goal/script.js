// 5.2.23 Lab: Reaching the Goal: a single-fire win check with delete().
// Move with a and d, jump with the space bar while standing on the ground.

let player, ground, goal, leftWall, rightWall;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';
  player.bounciness = 0.2;

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
  ground.friction = 0.5;

  goal = new Sprite(360, 340, 24, 24);
  goal.collider = 'none';
  goal.color = 'gold';

  leftWall = new Sprite(6, 200, 12, 400, 'static');
  leftWall.color = 'sienna';
  rightWall = new Sprite(394, 200, 12, 400, 'static');
  rightWall.color = 'sienna';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -7;
  }

  if (player.y < 200) {
    player.applyForce(0, -3);
  }

  // STEP 1: Add if (goal) { } here. Steps 2 and 3 go inside its braces,
  //         so the check only runs while the goal still exists.

  // STEP 2: Inside it, work out the distance from the player to the goal:
  //         dx = player.x - goal.x, dy = player.y - goal.y, then the
  //         square root of dx * dx + dy * dy (as in 5.2.22).

  // STEP 3: Still inside it, when the distance is less than 25, log a win
  //         message, call goal.delete(), and set goal to null so the check
  //         can never run again.
}
