/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.2.2 Swinging Pendulum — Worked Example

let anchor, rod, joint;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  anchor = new Sprite(200, 60, 20, 20, 'static');
  anchor.color = '#888';

  rod = new Sprite(200, 140, 20, 120);
  rod.color = 'tomato';

  joint = new HingeJoint(anchor, rod);
}

function update() {
  if (mouse.presses()) {
    rod.angularVelocity = 6;
  }
}

function draw() {
  background('#111');
}
