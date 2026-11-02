// 5.1.20 Make it Move (reference solution).
// WASD shown here. The arrow keys work the same way: swap in 'left', 'right', 'up', 'down'.

let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;
  else                       player.vel.x =  0;

  if      (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y =  4;
  else                       player.vel.y =  0;
}
