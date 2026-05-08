// 3.1.12 Project — Spinning Sculpture — reference solution
let bigCube, smallCube, tinyTop;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';

  smallCube = new Cube(0, 0, 0);
  smallCube.color = 'orange';
  smallCube.size = 0.6;

  parent(smallCube, bigCube);
  smallCube.position.y = 1.3;

  // MY ELEMENT: a tiny third cube parented to smallCube, completing the chain
  tinyTop = new Cube(0, 0, 0);
  tinyTop.color = 'hotpink';
  tinyTop.size = 0.35;
  parent(tinyTop, smallCube);
  tinyTop.position.y = 1.0;
}

function draw() {
  background('#000');

  bigCube.rotation.y = radians(frameCount * 1.5);
  bigCube.rotation.x = radians(frameCount * 0.7);
  bigCube.rotation.z = radians(frameCount * 0.3);

  smallCube.rotation.z = radians(-frameCount * 2);

  let r = Math.floor(128 + 127 * Math.sin(radians(frameCount * 1.2)));
  bigCube.color = 'rgb(' + r + ',80,200)';

  tinyTop.rotation.y = radians(frameCount * 4);
}
