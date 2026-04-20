/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.5.1 Joints — Distance, Hinge, Slider side by side.

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 10;

  // Ground
  new Sprite(300, 390, 600, 20, 'static').color = '#444';

  // --- DistanceJoint: two balls joined by an invisible rod ---
  let anchorA = new Sprite(100, 80, 16, 16, 'static');
  let ballA = new Sprite(150, 200, 30);
  ballA.color = 'tomato';
  new DistanceJoint(anchorA, ballA);

  // --- HingeJoint: pendulum ---
  let anchorB = new Sprite(300, 80, 16, 16, 'static');
  let rodB = new Sprite(300, 180, 20, 160);
  rodB.color = 'gold';
  new HingeJoint(anchorB, rodB);

  // --- SliderJoint: vertical piston ---
  let anchorC = new Sprite(500, 80, 16, 16, 'static');
  let pistonC = new Sprite(500, 200, 40, 60);
  pistonC.color = 'lightgreen';
  new SliderJoint(anchorC, pistonC);
}

function draw() {
  background('#111');
}
