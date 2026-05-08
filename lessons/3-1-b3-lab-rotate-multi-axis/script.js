// 3.1.B3 Build-Up — Rotate on Multiple Axes
// Starter includes B2's solution. Add only what B3 asks for.
let bigCube;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';
}

function draw() {
  background('#000');
  bigCube.rotation.y = radians(frameCount * 1.5);
  // STEP 1: Also assign bigCube.rotation.x using radians() and frameCount.
  //         Use a smaller multiplier than Y (try 0.7) for a different speed.

  // STEP 2: Also assign bigCube.rotation.z using radians() and frameCount.
  //         Use an even smaller multiplier (try 0.3).

}
