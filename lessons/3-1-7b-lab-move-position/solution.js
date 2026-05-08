// 3.1.7b Lab — solution
let cube;

function setup() {
  background('#111');
  cube = new Cube(0, 0, 0);
  cube.color = 'tomato';
}

function draw() {
  background('#111');
  cube.position.x += 0.05;
}
