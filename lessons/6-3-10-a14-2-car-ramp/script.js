// 6.3.10 A14.1 Car on a Ramp
// Open the Quest tab for the graded requirements; open the Docs tab for the moSHion API.

let ground, ramp, chassis, leftWheel, rightWheel, leftJoint, rightJoint;

function setup() {
  new Canvas(600, 400);

  // STEP 1: Enable gravity, create a flat static ground and a tilted static
  // ramp. Use .rotation in degrees to tilt the ramp.

  // STEP 2: Build the vehicle: a dynamic chassis rectangle and two dynamic
  // circular wheels (use .diameter to make them round). Give the wheels, the
  // ground and the ramp a .friction of 1: friction starts at 0 (ice), and a
  // wheel only grips a surface that has friction too.

  // STEP 3: Attach each wheel to the chassis with a HingeJoint, wheel first
  // so the pin sits at the wheel's centre.

}

function draw() {
  background('#222');

  // STEP 4: WASD-driven car: read WASD with kb.pressing and set
  // chassis.vel.x (spinning the wheels alone does not move the car).

}
