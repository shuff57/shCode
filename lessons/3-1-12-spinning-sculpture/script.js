// 3.1.12 Project — Spinning Sculpture
// Pre-filled: bigCube and smallCube declared and created for you.
// Complete STEPs 1–6 below.
let bigCube, smallCube;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';

  smallCube = new Cube(0, 0, 0);
  smallCube.color = 'orange';
  smallCube.size = 0.6;

  // STEP 3: Call parent(smallCube, bigCube) and set smallCube.position.y = 1.3

}

function draw() {
  background('#000');

  // STEP 1: Set bigCube.rotation.y using radians() and frameCount

  // STEP 2: Also set bigCube.rotation.x with a different (slower) multiplier

  // STEP 4: Set smallCube.rotation.z to spin opposite-direction on Z

  // STEP 5: Compute a sine-driven color and assign to bigCube.color

  // STEP 6: Add ONE creative element of your own and document with:
  // MY ELEMENT: <describe what you added>

}
