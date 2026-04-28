// 2.3.21 A14.1 Car on a Ramp
// Build a two-wheeled vehicle joined by WheelJoints and drive it up a tilted
// ramp with WASD. Open the Quest tab for the graded requirements; open the
// Docs tab for the q5play API.

let ground, ramp, chassis, leftWheel, rightWheel, leftJoint, rightJoint;

function setup() {
  new Canvas(600, 400);

  // STEP 1: Enable gravity, create the static ground and the tilted ramp.
  //   world.gravity.y = 20;
  //   ground = new Sprite(300, 380, 600, 20, 'static');
  //   ramp = new Sprite(450, 340, 200, 12, 'static');
  //   ramp.rotation = -Math.PI / 8;

  // STEP 2: Chassis + two wheels (dynamic).
  //   chassis = new Sprite(120, 320, 80, 20);
  //   leftWheel = new Sprite(100, 340, 20);   // diameter form makes a circle
  //   leftWheel.diameter = 24;
  //   rightWheel = new Sprite(140, 340, 20);
  //   rightWheel.diameter = 24;

  // STEP 3: Join wheels to chassis with WheelJoints.
  //   leftJoint = new WheelJoint(chassis, leftWheel);
  //   rightJoint = new WheelJoint(chassis, rightWheel);
}

function draw() {
  background('#222');

  // STEP 4: WASD-driven wheels — set angularVelocity on each wheel from
  // kb.pressing. Drive both wheels for all-wheel drive.
  //   if (kb.pressing('d')) {
  //     leftWheel.angularVelocity = 10;
  //     rightWheel.angularVelocity = 10;
  //   } else if (kb.pressing('a')) {
  //     leftWheel.angularVelocity = -10;
  //     rightWheel.angularVelocity = -10;
  //   }
}
