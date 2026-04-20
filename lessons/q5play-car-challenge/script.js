/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.2.3 Car on a Ramp — Challenge
// Arrow keys drive. Build the car with two wheels using WheelJoint.

let chassis, leftWheel, rightWheel;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 10;

  // TODO: ground and a tilted ramp (.rotation = some angle in radians)

  // TODO: chassis (dynamic rectangle) + two wheels (dynamic, circular)

  // TODO: attach wheels with new WheelJoint(chassis, wheel)
}

function update() {
  // TODO: kb.pressing('right') → leftWheel.angularVelocity = 10 (and rightWheel)
  // TODO: kb.pressing('left')  → leftWheel.angularVelocity = -10
}

function draw() {
  background('#1a1a1a');
}
