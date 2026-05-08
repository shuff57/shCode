// 3.2.5 Example — Shape Zoo
// All six shPlay primitives in one scene.
// Each is placed at a different x position and given a unique color.
// Watch them spin, then modify freely — click Refresh to reset.

let cube, sphere, plane, cone, cylinder, torus;

function setup() {
  background('#111');

  cube = new Cube(-5, 0, 0);
  cube.color = 'tomato';

  sphere = new Sphere(-3, 0, 0, 0.7);
  sphere.color = 'deepskyblue';

  plane = new Plane(-1, 0, 0, 1.5, 1.5);
  plane.color = '#888';

  cone = new Cone(1, 0, 0, 0.6, 1.5);
  cone.color = 'orange';

  cylinder = new Cylinder(3, 0, 0, 0.5, 1.5);
  cylinder.color = 'limegreen';

  torus = new Torus(5, 0, 0, 0.8, 0.25);
  torus.color = 'gold';
}

function draw() {
  background('#111');
  cube.rotation.y += 0.01;
  sphere.rotation.y += 0.01;
  plane.rotation.y += 0.01;
  cone.rotation.y += 0.01;
  cylinder.rotation.y += 0.01;
  torus.rotation.y += 0.01;
}
