// 2.3.21 A14.1 Car on a Ramp (reference solution).
// Two-wheeled chassis joined by WheelJoints; WASD drives the wheels.

let ground, ramp, chassis, leftWheel, rightWheel;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 10;

  ground = new Sprite(300, 380, 600, 40, 'static');
  ground.color = '#444';

  ramp = new Sprite(450, 340, 200, 20, 'static');
  ramp.color = '#666';
  ramp.rotation = -Math.PI / 8;

  chassis = new Sprite(120, 280, 70, 20);
  chassis.color = 'deepskyblue';

  leftWheel = new Sprite(95, 305, 20);
  leftWheel.diameter = 20;
  leftWheel.color = 'orange';

  rightWheel = new Sprite(145, 305, 20);
  rightWheel.diameter = 20;
  rightWheel.color = 'orange';

  new WheelJoint(chassis, leftWheel);
  new WheelJoint(chassis, rightWheel);
}

function draw() {
  background('#222');

  if      (kb.pressing('d')) chassis.vel.x =  4;
  else if (kb.pressing('a')) chassis.vel.x = -4;
  else                       chassis.vel.x =  0;
}
