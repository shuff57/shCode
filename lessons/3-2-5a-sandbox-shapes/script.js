// 3.2.5a Sandbox — Shape Gallery
// All six primitives are pre-placed. Try editing the constructor arguments:
// - Change the radius values
// - Change height values
// - Change tubeRadius on the Torus
// - Change colors
// Click Run to see your changes live. Click Refresh to reset.

let cube, sphere, plane, cone, cylinder, torus;

function setup() {
  background('#111');

  // Cube: new Cube(x, y, z) — try changing the position
  cube = new Cube(-5, 0, 0);
  cube.color = 'tomato';

  // Sphere: new Sphere(x, y, z, radius) — try changing the radius
  sphere = new Sphere(-3, 0, 0, 0.7);
  sphere.color = 'deepskyblue';

  // Plane: new Plane(x, y, z, width, height) — try changing width/height
  plane = new Plane(-1, 0, 0, 1.5, 1.5);
  plane.color = '#888';

  // Cone: new Cone(x, y, z, radius, height) — try a fat short cone vs a tall thin one
  cone = new Cone(1, 0, 0, 0.6, 1.5);
  cone.color = 'orange';

  // Cylinder: new Cylinder(x, y, z, radius, height) — compare with Cone above
  cylinder = new Cylinder(3, 0, 0, 0.5, 1.5);
  cylinder.color = 'limegreen';

  // Torus: new Torus(x, y, z, ringRadius, tubeRadius) — try a fat torus vs a thin ring
  torus = new Torus(5, 0, 0, 0.8, 0.25);
  torus.color = 'gold';
}

function draw() {
  background('#111');
  cube.rotation.y += 0.008;
  sphere.rotation.y += 0.008;
  plane.rotation.y += 0.008;
  cone.rotation.y += 0.008;
  cylinder.rotation.y += 0.008;
  torus.rotation.x += 0.008;
}
