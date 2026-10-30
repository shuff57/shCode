// 5.2.20 Challenges: Optional Stretch: a second goal and a two-goal finish.
// This is the one-goal scene from 5.2.17. Run it first: touch the gold goal
// and the console prints the win line once.

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

  // STEP 2: add a second goal sprite somewhere harder to reach. Above the
  //         wind zone (y less than 200) is a good spot.
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

  // STEP 2 (continued): give the second goal its own check, the same shape
  //         as the one above.

  // STEP 3: count the goals. Start a counter at 0 at the top of the file and
  //         add 1 to it each time a goal is deleted.

  // STEP 4: once the counter reaches 2, print 'All goals collected!' one
  //         time only.
}
