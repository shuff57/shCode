// 2.3.5 Groups Sandbox (reference solution).
// Spawn yellow stars from a Group, drift them downward, despawn off-screen.

let stars;

function setup() {
  new Canvas(400, 400);

  stars = new Group();
  stars.color = 'yellow';
  stars.diameter = 10;
  stars.collider = 'none';
}

function draw() {
  background('#111');

  // Spawn one star every 8 frames at a random x.
  if (frameCount % 8 === 0) {
    let s = new stars.Sprite(Math.random() * 400, 0);
    s.vel.y = 2 + Math.random() * 2;
  }

  // Despawn anything past the bottom edge. Iterate a copy so .delete()
  // doesn't skip neighbours.
  for (let s of [...stars]) {
    if (s.y > 410) s.delete();
  }
}
