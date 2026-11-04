// 6.4.2 Sub-build: A pocket you roll over (reference solution).
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
  pocket.collider = 'none';
}

function draw() {
  background('green');
  if (ball.overlaps(pocket) && ball.speed < 1 && !sunk) {
    ball.speed = 0;
    ball.x = pocket.x;
    ball.y = pocket.y;
    sunk = true;
  }
}
