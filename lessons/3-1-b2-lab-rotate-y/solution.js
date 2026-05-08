// 3.1.B2 Build-Up — Rotate on Y — solution
let bigCube;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';
}

function draw() {
  background('#000');
  bigCube.rotation.y = radians(frameCount * 1.5);
}
