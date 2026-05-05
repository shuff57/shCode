// 2.4.10 A15.1 Side-Scrolling Platformer (reference solution).
// Player visual swap + camera follow + 3+ platforms + ground-gated jump
// + goal overlap with win text.

let player, goal, won = false;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  player = new Sprite(60, 200, 24, 24);
  player.color = 'deepskyblue';
  player.image = '🧍';

  // Ground spans the level wider than the canvas.
  let ground = new Sprite(600, 280, 1400, 40, 'static');
  ground.color = '#444';

  // Three (+) static platforms across the level.
  let p1 = new Sprite(220, 220, 100, 12, 'static'); p1.color = '#555';
  let p2 = new Sprite(420, 180, 100, 12, 'static'); p2.color = '#555';
  let p3 = new Sprite(620, 150, 100, 12, 'static'); p3.color = '#555';
  let p4 = new Sprite(820, 200, 120, 12, 'static'); p4.color = '#555';

  goal = new Sprite(1100, 230, 28, 60);
  goal.color = 'lime';
  goal.collider = 'none';
}

function draw() {
  background('#111');

  if      (kb.pressing('a')) { player.vel.x = -4; player.image = '🏃'; }
  else if (kb.pressing('d')) { player.vel.x =  4; player.image = '🏃'; }
  else                       { player.vel.x =  0; player.image = '🧍'; }

  if (kb.presses('w') && player.colliding(allSprites)) {
    player.vel.y = -7;
  }

  camera.x = player.x;

  if (player.overlaps(goal)) won = true;
  if (won) {
    fill('white');
    textSize(28);
    textAlign(CENTER);
    text('You win!', camera.x, 100);
  }
}
