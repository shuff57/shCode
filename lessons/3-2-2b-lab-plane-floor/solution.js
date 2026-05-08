// 3.2.2b Lab — Plane as floor — solution
let floor, sphere;

function setup() {
  floor = new Plane(0, -1, 0, 10, 10);
  floor.color = '#444';

  sphere = new Sphere(0, 0.5, 0, 0.7);
  sphere.color = 'tomato';
}

function draw() {
  background('#111');
}
