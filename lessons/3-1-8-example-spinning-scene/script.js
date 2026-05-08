// 3.1.8 Example — Spinning Scene
// A Cube spins on Y and Z simultaneously.
// A Sphere sits at an offset position for contrast.
// Modify the code freely — click Refresh to reset.

let cube, sphere;

function setup() {
  background('#111');
  cube = new Cube(0, 0, 0);
  cube.color = 'tomato';

  sphere = new Sphere(3, 1, -1, 0.7);
  sphere.color = 'deepskyblue';
}

function draw() {
  background('#111');
  // Y spin: steady rotation per frame
  cube.rotation.y += 0.02;
  // Z oscillation: Math.sin creates a back-and-forth rock
  cube.rotation.z = Math.sin(frameCount * 0.01) * radians(30);
}
