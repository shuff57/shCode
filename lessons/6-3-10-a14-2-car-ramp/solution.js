// 6.3.10 A14.1 Car on a Ramp (reference solution).
// Two-wheeled chassis joined by HingeJoints; A and D drive the chassis.

let ground, ramp, chassis, leftWheel, rightWheel;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 10;

  ground = new Sprite(300, 380, 600, 40, 'static');
  ground.color = '#444';

  ramp = new Sprite(450, 340, 200, 20, 'static');
  ramp.color = '#666';
  ramp.rotation = -20;

  chassis = new Sprite(120, 280, 70, 20);
  chassis.color = 'deepskyblue';

  leftWheel = new Sprite(95, 305, 20);
  leftWheel.diameter = 20;
  leftWheel.color = 'orange';

  rightWheel = new Sprite(145, 305, 20);
  rightWheel.diameter = 20;
  rightWheel.color = 'orange';

  // Friction starts at 0 (ice) and two touching sprites use a mix of both
  // values, so the wheels AND what they roll on need it, or the wheels slide.
  leftWheel.friction = 1;
  rightWheel.friction = 1;
  ground.friction = 1;
  ramp.friction = 1;

  // Wheel first: the hinge pins at the FIRST sprite, so each pin sits at
  // the wheel's own centre, like an axle (6.3.8).
  new HingeJoint(leftWheel, chassis);
  new HingeJoint(rightWheel, chassis);
}

function draw() {
  background('#222');

  if      (kb.pressing('d')) chassis.vel.x =  4;
  else if (kb.pressing('a')) chassis.vel.x = -4;
  else                       chassis.vel.x =  0;
}
