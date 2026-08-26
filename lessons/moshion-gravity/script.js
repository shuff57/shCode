// 5.1.3 Falling Block: a worked example of gravity + static sprites.

let block, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  // Dynamic: affected by gravity and collisions
  block = new Sprite(200, 60, 40, 40);
  block.color = 'orange';

  // Static: fixed in place, pushes back on dynamic sprites
  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
}

function draw() {
  background('#222');
}
