// 3.1.7c Lab — solution
let cube;

function setup() {
  background('#111');
  cube = new Cube(0, 0, 0);
  cube.color = 'deepskyblue';
}

function draw() {
  background('#111');
  cube.rotation.y += 0.01;
}
