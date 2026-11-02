// 5.2.17 Lab: Reaching the Goal: a single-fire win check with delete().

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

  if (goal) {
    const dx = player.x - goal.x;
    const dy = player.y - goal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) {
      console.log('You win!');
      goal.delete();
      goal = null;
    }
  }
}
