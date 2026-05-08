// Wave 0 smoke-test sketch.
// Creates a rotating Cube on a Plane floor with a dark background.
// If this renders in the iframe, the shPlay pipeline (shplay.js,
// vendored three.js, ShPlayPreview) is wired correctly.
let cube;

function setup() {
  background('#222');
  cube = new Cube(0, 0, 0, 1.5);
  cube.color = 'tomato';
  new Plane(0, -1, 0, 8, 8);
}

function draw() {
  background('#222');
  cube.rotation.y += 0.01;
  cube.rotation.x = Math.sin(frameCount * 0.008) * 0.3;
}
