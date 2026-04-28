// 2.3.11 A13.1 Asteroid Field
// Build a playable scene combining Groups, WASD steering, overlap detection,
// and safe despawn. Open the Quest tab for the graded requirements; open the
// Docs tab for the q5play API.

let ship, asteroids;

function setup() {
  new Canvas(400, 400);

  // STEP 1: Create the player ship sprite.
  //   ship = new Sprite(200, 200, 30, 30);

  // STEP 1: Create an asteroids Group.
  //   asteroids = new Group();
  //   asteroids.color = 'gray';

  // STEP 3: Spawn at least 10 asteroids with varied velocity.
  //   for (let i = 0; i < 10; i++) {
  //     let a = new asteroids.Sprite(Math.random() * 400, Math.random() * 400, 24, 24);
  //     a.vel.x = (Math.random() - 0.5) * 4;
  //     a.vel.y = (Math.random() - 0.5) * 4;
  //   }
}

function draw() {
  background('#000');

  // STEP 2: WASD steering — set ship.vel.x / vel.y from kb.pressing.
  //   if (kb.pressing('a'))      ship.vel.x = -3;
  //   else if (kb.pressing('d')) ship.vel.x = 3;
  //   else                       ship.vel.x = 0;
  //   if (kb.pressing('w'))      ship.vel.y = -3;
  //   else if (kb.pressing('s')) ship.vel.y = 3;
  //   else                       ship.vel.y = 0;

  // STEP 4: Overlap-driven hit state — when ship overlaps any asteroid,
  // change the scene (background flash, end the game, etc).
  //   if (ship.overlaps(asteroids)) {
  //     // your hit response
  //   }

  // STEP 5: Safe despawn — iterate a copy when removing.
  //   for (let a of [...asteroids]) {
  //     if (a.x < -50 || a.x > 450 || a.y < -50 || a.y > 450) {
  //       asteroids.remove(a);
  //     }
  //   }
}
