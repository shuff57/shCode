// 6.4.19 Challenges (reference solution).
//
// Demonstrates Challenge 1 (parallax clouds), Challenge 2 (flip the player
// to face the way they are walking) and Challenge 3 (vertical camera
// follow). Any ONE of the three is enough to pass the grader.

let player;
let clouds = [];

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 10;

  // STEP 1 — the foreground: ground, then platforms stacked upward so there
  // is something to climb and a reason for the camera to move on y.
  let ground = new Sprite(300, 560, 2000, 40, 'static');
  ground.color = '#353';

  let ledges = [
    { x: 240, y: 470 },
    { x: 430, y: 380 },
    { x: 250, y: 290 },
    { x: 450, y: 200 },
  ];
  for (let spot of ledges) {
    let ledge = new Sprite(spot.x, spot.y, 140, 18, 'static');
    ledge.color = '#576';
  }

  player = new Sprite(200, 500, 28, 40);
  player.color = 'gold';
  player.rotationLock = true;

  // STEP 2 — Challenge 1. Each cloud remembers the x it was BORN at. Its
  // drawn position is that base plus a fraction of the camera, which is what
  // makes it drift slower than the ground and read as further away.
  for (let i = 0; i < 8; i++) {
    let cloud = new Sprite(i * 160, 120 + (i % 3) * 60, 90, 30);
    cloud.color = '#8898b8';
    cloud.collider = 'none';   // scenery: nothing should bump into it
    cloud.layer = 0;           // STEP 7 feature — draw it behind the action
    cloud.baseX = cloud.x;
    clouds.push(cloud);
  }
}

function draw() {
  background('#224');

  // STEP 4 — input.
  if (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else player.vel.x = 0;

  if (kb.presses('space') || kb.presses('w')) player.vel.y = -9;

  // STEP 5 and STEP 8 — ease the camera toward the player on BOTH axes.
  // lerp moves a fraction of the remaining distance each frame, so the
  // camera trails instead of snapping, and a jump does not jerk the view.
  camera.x = lerp(camera.x, player.x, 0.1);
  camera.y = lerp(camera.y, player.y, 0.05);

  // STEP 6 — Challenge 1. A smaller multiplier means the cloud moves less
  // per unit of camera travel, which reads as further away.
  for (let cloud of clouds) {
    cloud.x = cloud.baseX + camera.x * 0.3;
  }

  // STEP 7 — Challenge 2. -1 mirrors the sprite horizontally, so it faces
  // the way it is walking. Left alone when standing still, so it keeps
  // facing wherever it last went.
  if (player.vel.x < 0) player.scale.x = -1;
  else if (player.vel.x > 0) player.scale.x = 1;
}
