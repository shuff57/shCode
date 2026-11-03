// 5.2.22 Lab: Rules in update(), picture in draw() (reference solution).

let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
}

// the rules: keys and movement, before physics moves anything
function update() {
  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -7;
  }
}

// the picture: background and words, after physics
function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('a and d move, space jumps', 20, 26);
}
