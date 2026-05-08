// 3.1.B5 Build-Up — Color Cycle — solution
let bigCube, smallCube;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';

  smallCube = new Cube(0, 0, 0);
  smallCube.color = 'orange';
  smallCube.size = 0.6;

  parent(smallCube, bigCube);
  smallCube.position.y = 1.3;
}

function draw() {
  background('#000');
  bigCube.rotation.y = radians(frameCount * 1.5);
  bigCube.rotation.x = radians(frameCount * 0.7);
  bigCube.rotation.z = radians(frameCount * 0.3);
  smallCube.rotation.z = radians(-frameCount * 2);

  let r = Math.floor(128 + 127 * Math.sin(radians(frameCount * 1.2)));
  bigCube.color = 'rgb(' + r + ',80,200)';
}
