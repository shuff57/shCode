let ship, bullets, rocks;
let lives = 3;

function setup() {
  new Canvas(500, 500);
  ship = new Sprite(250, 250, 30, 'none');
  ship.img = '🚀';

  bullets = new Group();
  bullets.diameter = 6;
  bullets.color = 'yellow';
  bullets.life = 60;

  rocks = new Group();
  rocks.diameter = 40;
  rocks.color = 'gray';

  bullets.overlaps(rocks, hit);
  camera.zoom = 1.2;
}

function hit(b, r) {
  b.remove();
  r.remove();
}

function draw() {
  background(10);
  ship.rotateTowards(mouse, 0.2, 0);

  if (frameCount % 60 == 0) {
    let r = new rocks.Sprite(random(width), -20);
    r.vel.y = random(1, 3);
  }
  rocks.cull(50);

  if (ship.overlaps(rocks)) {
    lives--;
    rocks.removeAll();
  }

  fill(255);
  text('Lives: ' + lives, 10, 20);
  if (lives <= 0) {
    world.timeScale = 0;
    textSize(40);
    text('GAME OVER', 130, 250);
  }
}

function mousePressed() {
  let b = new bullets.Sprite(ship.x, ship.y);
  b.direction = ship.rotation;
  b.speed = 8;
}
