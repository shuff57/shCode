// 5.4.2 Camera Follow — a scrolling side-view level.

let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  ground = new Sprite(1000, 390, 2000, 20, 'static');
  ground.color = '#554433';

  for (let i = 0; i < 5; i++) {
    let p = new Sprite(200 + i * 300, 280 - (i % 2) * 60, 120, 16, 'static');
    p.color = '#776655';
  }

  player = new Sprite(100, 300, 30, 40);
  player.color = 'deepskyblue';
}

function update() {
  if (kb.pressing('left')) player.vel.x = -5;
  else if (kb.pressing('right')) player.vel.x = 5;
  else player.vel.x = 0;

  if (kb.presses(' ') && player.vel.y > -0.01 && player.vel.y < 0.01) {
    player.vel.y = -9;
  }

  camera.x = player.x;
}

function draw() {
  background('#224466');
}
