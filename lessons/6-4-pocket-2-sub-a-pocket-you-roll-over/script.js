// 6.4.3 Sub-build: A pocket you roll over.
let ball, pocket, sunk = false;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  ball = new Sprite(100, 200, 20);
  ball.color = 'white';
  ball.speed = 4;
  ball.direction = 0;
  pocket = new Sprite(300, 200, 34, 34, 'static');
  pocket.color = 'black';
  // STEP 1: the pocket must not be solid.
}

function draw() {
  background('green');
  // STEP 2: a slow ball overlapping the pocket drops in, once.
}
