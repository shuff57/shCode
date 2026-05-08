// 3.1.5a Sandbox — Axes Explorer
// Three colored cylinders show the X, Y, and Z directions.
// Red  = X axis (right is positive X)
// Green = Y axis (up is positive Y)
// Blue  = Z axis (toward you is positive Z)
//
// Try changing cube.position.x, .y, or .z below, then click Run.
// Which direction does the cube move?

let cube;
let axisX, axisY, axisZ;

function setup() {
  background('#111');

  // The white cube at the origin — move this to explore
  cube = new Cube(0, 0, 0);
  cube.color = 'white';

  // Red cylinder along the X axis
  axisX = new Cylinder(0, 0, 0, 0.05, 4);
  axisX.color = 'red';
  axisX.rotation.z = radians(90); // lay it flat along X

  // Green cylinder along the Y axis (vertical by default)
  axisY = new Cylinder(0, 0, 0, 0.05, 4);
  axisY.color = 'limegreen';

  // Blue cylinder along the Z axis
  axisZ = new Cylinder(0, 0, 0, 0.05, 4);
  axisZ.color = 'deepskyblue';
  axisZ.rotation.x = radians(90); // lay it flat along Z

  // Try changing these values:
  cube.position.x = 0;  // positive = right, negative = left
  cube.position.y = 0;  // positive = up, negative = down
  cube.position.z = 0;  // positive = toward you, negative = away
}

function draw() {
  background('#111');
}
