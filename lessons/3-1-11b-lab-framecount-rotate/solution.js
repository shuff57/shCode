// 3.1.11b Lab — solution
let cube;

function setup() {
  background('#111');
  cube = new Cube(0, 0, 0);
  cube.color = 'hotpink';
}

function draw() {
  background('#111');
  cube.rotation.y = frameCount * 0.02;
}
