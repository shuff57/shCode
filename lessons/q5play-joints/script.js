/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.5.1 Joints — connect two sprites with a constraint.
// Build one of each: DistanceJoint, HingeJoint, SliderJoint.
// Uncomment each STEP and fill in the code.

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 10;

  // Static ground so nothing falls forever
  new Sprite(300, 390, 600, 20, 'static').color = '#444';

  // --- STEP 1: DistanceJoint — keeps two sprites at a fixed distance ---
  //   let anchorA = new Sprite(100, 80, 16, 16, 'static');
  //   let ballA = new Sprite(150, 200, 30);
  //   ballA.color = 'tomato';
  //   new DistanceJoint(anchorA, ballA);

  // --- STEP 2: HingeJoint — rotates freely around an anchor (pendulum) ---
  //   let anchorB = new Sprite(300, 80, 16, 16, 'static');
  //   let rodB = new Sprite(300, 180, 20, 160);
  //   rodB.color = 'gold';
  //   new HingeJoint(anchorB, rodB);

  // --- STEP 3: SliderJoint — only translates along one axis (piston) ---
  //   let anchorC = new Sprite(500, 80, 16, 16, 'static');
  //   let pistonC = new Sprite(500, 200, 40, 60);
  //   pistonC.color = 'lightgreen';
  //   new SliderJoint(anchorC, pistonC);
}

function draw() {
  // STEP 4: Clear the background
  //   background('#111');
}
