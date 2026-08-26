// 2.3.11 A13.1 Asteroid Field (reference solution).
// WASD ship + asteroid Group + overlap-driven hit state + safe despawn.

let ship, asteroids, hit = false;

function setup() {
  new Canvas(400, 400);

  ship = new Sprite(200, 200, 24, 24);
  ship.color = 'deepskyblue';
  ship.collider = 'none';

  asteroids = new Group();
  asteroids.color = 'gray';
  asteroids.diameter = 22;
  asteroids.collider = 'none';

  for (let i = 0; i < 12; i++) {
    let a = new asteroids.Sprite(Math.random() * 400, Math.random() * 400);
    a.vel.x = (Math.random() - 0.5) * 3;
    a.vel.y = (Math.random() - 0.5) * 3;
  }
}

function draw() {
  background(hit ? '#400': '#000');

  if (!hit) {
    if      (kb.pressing('a')) ship.vel.x = -3;
    else if (kb.pressing('d')) ship.vel.x =  3;
    else                       ship.vel.x =  0;
    if      (kb.pressing('w')) ship.vel.y = -3;
    else if (kb.pressing('s')) ship.vel.y =  3;
    else                       ship.vel.y =  0;

    if (ship.overlaps(asteroids)) hit = true;
  } else {
    ship.vel.x = 0;
    ship.vel.y = 0;
  }

  // Safe despawn: wrap or remove asteroids that drift offscreen.
  for (let a of [...asteroids]) {
    if (a.x < -30 || a.x > 430 || a.y < -30 || a.y > 430) a.delete();
  }

  if (hit) {
    fill('white');
    textSize(28);
    textAlign(CENTER);
    text('HIT', 200, 200);
  }
}
