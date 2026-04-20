/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.5.2 Slingshot — drag ball back, release to launch.

let anchor, ball, tether;
let dragging = false;

function setup() {
  new Canvas(500, 400);
  world.gravity.y = 10;

  new Sprite(250, 390, 500, 20, 'static').color = '#554433';

  anchor = new Sprite(100, 250, 16, 16, 'static');
  anchor.color = '#888';

  ball = new Sprite(100, 250, 24);
  ball.color = 'orange';
  tether = new DistanceJoint(anchor, ball);

  // A few knockable targets
  for (let i = 0; i < 3; i++) {
    let b = new Sprite(400, 370 - i * 30, 28, 28);
    b.color = 'skyblue';
  }
}

function update() {
  if (mouse.pressing() && ball.overlapping({ x: mouse.x, y: mouse.y, width: 30, height: 30 })) {
    dragging = true;
  }
  if (dragging && mouse.pressing()) {
    ball.x = mouse.x;
    ball.y = mouse.y;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
  if (dragging && !mouse.pressing()) {
    dragging = false;
    if (tether) { tether.remove(); tether = null; }
  }
}

function draw() {
  background('#223');
}
