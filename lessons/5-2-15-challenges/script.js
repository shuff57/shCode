// 5.2.26 Challenges: Optional Stretch: a second goal and a two-goal finish.
// This is the one-goal scene from 5.2.23. Run it first: touch the gold goal
// and the console prints the win line once.
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

  // STEP 2: add a second goal sprite somewhere harder to reach. Up in the
  //         wind zone (y less than 200), which only a jump reaches, is a
  //         good spot: x = 360, y = 120 can be reached by jumping from
  //         where the first goal sits.
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
