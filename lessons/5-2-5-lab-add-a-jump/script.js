// 5.2.5 Lab: Add a Jump: gate a jump on a key press and a ground check.

let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  // STEP 1: Make the player jump when the jump key is pressed AND the
  //         player is touching the ground. Use an edge-triggered key
  //         check (fires once per press) combined with a ground check,
  //         joined with &&. When both are true, set the player's
  //         vertical velocity to a negative number to launch it upward.
}
