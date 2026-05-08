// 3.1.B4 Build-Up — Stack a Second Cube
// Starter includes B3's solution. Add only what B4 asks for.
let bigCube, smallCube;

function setup() {
  background('#000');
  bigCube = new Cube(0, 0, 0);
  bigCube.color = 'yellow';

  // STEP 1: Create smallCube = new Cube(0, 0, 0).
  //         Set its color to 'orange' and its size to 0.6.

  // STEP 2: Call the parenting function with smallCube as the child and bigCube as the parent.
  //         Then set smallCube.position.y = 1.3 to place it above bigCube.

}

function draw() {
  background('#000');
  bigCube.rotation.y = radians(frameCount * 1.5);
  bigCube.rotation.x = radians(frameCount * 0.7);
  bigCube.rotation.z = radians(frameCount * 0.3);

  // STEP 3: In draw(), assign a rotation on the Z axis for smallCube.
  //         Use a negative multiplier so it spins opposite to bigCube.

}
