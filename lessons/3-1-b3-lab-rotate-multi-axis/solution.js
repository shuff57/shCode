// 3.1.B3 Build-Up — Rotate on Multiple Axes — solution
let bigCube;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';
}

function draw() {
  background('#000');
  bigCube.rotation.y = radians(frameCount * 1.5);
  bigCube.rotation.x = radians(frameCount * 0.7);
  bigCube.rotation.z = radians(frameCount * 0.3);
}
