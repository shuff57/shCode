// 3.2.2a Lab — Sphere with color — solution
let sphere;

function setup() {
  sphere = new Sphere(0, 0, 0, 1);
  sphere.color = 'deepskyblue';
}

function draw() {
  background('#111');
  sphere.rotation.y += 0.01;
}
