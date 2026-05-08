// 3.1.9a Sandbox — Transform Playground
// A Cube you can modify. Try changing the values below and clicking Run.

let cube;

function setup() {
  background('#222');
  cube = new Cube(0, 0, 0);
  cube.color = 'gold';

  // Try changing these:
  cube.position.x = 0;    // positive = right, negative = left
  cube.position.y = 0;    // positive = up, negative = down
  cube.rotation.x = 0;    // tilt forward/back (in radians)
  cube.rotation.y = 0;    // spin left/right (try radians(45))
  cube.scale.x = 1;       // stretch width (try 2 or 0.5)
  cube.scale.y = 1;       // stretch height
}

function draw() {
  background('#222');
  // Try adding: cube.rotation.y += 0.01;
  // Try adding: cube.rotation.z = Math.sin(frameCount * 0.02) * radians(20);
}
