// 3.1.B5 Build-Up — Color Cycle
// Starter includes B4's solution. Add only what B5 asks for.
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

  // STEP 1: Compute a sine-driven red channel value (0–255 range using Math.floor,
  //         a base of 128, and amplitude 127). Then assign bigCube.color to an
  //         rgb() string using that value — e.g. 'rgb(r, 80, 200)'.

}
