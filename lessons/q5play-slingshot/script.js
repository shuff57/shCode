/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.5.2 Slingshot — drag near the ball to grab, release to launch.

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

  // Knockable targets
  for (let i = 0; i < 3; i++) {
    let b = new Sprite(400, 370 - i * 30, 28, 28);
    b.color = 'skyblue';
  }
}

function update() {
  let dx = mouse.x - ball.x;
  let dy = mouse.y - ball.y;
  let nearBall = dx * dx + dy * dy < 40 * 40;

  if (mouse.pressing() && (dragging || nearBall)) {
    dragging = true;
    ball.x = mouse.x;
    ball.y = mouse.y;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }

  if (dragging && !mouse.pressing()) {
    dragging = false;
    if (tether) {
      tether.remove();
      tether = null;
    }
  }
}

function draw() {
  background('#223');
}
