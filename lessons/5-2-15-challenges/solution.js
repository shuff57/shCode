let player, ground, goal1, goal2;
let collected = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';
  player.bounciness = 0.6;

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.friction = 0.5;

  goal1 = new Sprite(360, 340, 24, 24);
  goal1.collider = 'none';
  goal1.color = 'gold';

  goal2 = new Sprite(360, 120, 24, 24);
  goal2.collider = 'none';
  goal2.color = 'gold';
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

  if (goal1) {
    const dx = player.x - goal1.x;
    const dy = player.y - goal1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) {
      goal1.delete();
      goal1 = null;
      collected += 1;
    }
  }

  if (goal2) {
    const dx = player.x - goal2.x;
    const dy = player.y - goal2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) {
      goal2.delete();
      goal2 = null;
      collected += 1;
    }
  }

  if (collected === 2) {
    console.log('All goals collected!');
    collected = 3;
  }
}
