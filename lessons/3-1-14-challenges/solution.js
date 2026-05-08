// 3.1.14 Challenges — combined reference solution demonstrating all three.

let bigCube, smallCube, tinyTop;
let frozen = false;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';

  smallCube = new Cube(0, 0, 0);
  smallCube.color = 'orange';
  smallCube.size = 0.6;

  parent(smallCube, bigCube);
  smallCube.position.y = 1.3;

  // Challenge 1: chain a third cube
  tinyTop = new Cube(0, 0, 0);
  tinyTop.color = 'hotpink';
  tinyTop.size = 0.35;
  parent(tinyTop, smallCube);
  tinyTop.position.y = 1.0;
}

function draw() {
  background('#000');

  // Challenge 3: freeze toggle
  if (kb.presses('space')) frozen = !frozen;

  if (!frozen) {
    bigCube.rotation.y = radians(frameCount * 1.5);
    bigCube.rotation.x = radians(frameCount * 0.7);
    bigCube.rotation.z = radians(frameCount * 0.3);
    smallCube.rotation.z = radians(-frameCount * 2);
    tinyTop.rotation.y = radians(frameCount * 4);

    let r = Math.floor(128 + 127 * Math.sin(radians(frameCount * 1.2)));
    bigCube.color = 'rgb(' + r + ',80,200)';

    // Challenge 2: pulsing scale
    bigCube.size = 1 + 0.4 * Math.sin(radians(frameCount * 1.5));
  }
}
