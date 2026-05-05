// 2.1.9 Make it Move (reference solution).
// Arrow-key control with else-to-zero so the sprite stops cleanly.

let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function update() {
  if      (kb.pressing('left'))  player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x =  4;
  else                           player.vel.x =  0;

  if      (kb.pressing('up'))    player.vel.y = -4;
  else if (kb.pressing('down'))  player.vel.y =  4;
  else                           player.vel.y =  0;
}

function draw() {
  background('#222');
}
