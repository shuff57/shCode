// 2.3.20 A14.1 Space Jumper (reference solution).
// WASD player + ground-gated jump (kb.presses(' ') + .colliding(ground))
// + goal overlap.

let player, ground, goal, won = false;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 10;

  ground = new Sprite(300, 380, 600, 40, 'static');
  ground.color = '#444';

  player = new Sprite(60, 320, 30, 30);
  player.color = 'deepskyblue';

  goal = new Sprite(540, 340, 30, 60);
  goal.color = 'lime';
  goal.collider = 'none';
}

function draw() {
  background(won ? '#040' : '#222');

  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;
  else                       player.vel.x =  0;

  // Ground-gated jump — kb.presses(' ') is edge-triggered (one tap = one jump),
  // .colliding(ground) is truthy only while the player touches the ground.
  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -7;
  }

  if (player.overlaps(goal)) won = true;

  if (won) {
    fill('white');
    textSize(28);
    textAlign(CENTER);
    text('You win!', 300, 200);
  }
}
