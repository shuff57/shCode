// 2.3.11 A13.1 Asteroid Field
// Open the Quest tab for the graded requirements; open the Docs tab for the moSHion API.

let ship, asteroids;

function setup() {
  new Canvas(400, 400);

  // STEP 1: Create the player ship sprite, then create the asteroids Group.

  // STEP 3: Spawn at least 10 asteroids — pick random positions, give each one
  // its own vel.x and vel.y so they drift in different directions.

}

function draw() {
  background('#000');

  // STEP 2: WASD steering — set ship.vel.x and ship.vel.y from kb.pressing.
  // Else-to-zero so the ship doesn't keep drifting.

  // STEP 4: Overlap-driven hit state — when the ship overlaps the asteroids
  // Group, change the scene clearly (background flash, end the game, etc).

  // STEP 5: Safe despawn — remove asteroids that leave the canvas.
  // Iterate a copy ([...group]) or iterate backwards so removal doesn't skip.

}
