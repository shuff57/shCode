// 6.19.3 Lab: Bring the wall down.
let base, arm, shots = [], blocks = [];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  base = new Sprite(100, 250, 80, 20, 'static');
  base.color = 'gray';
  arm = new Sprite(100, 210, 80, 12);
  arm.collider = 'none';
  arm.color = 'sienna';

  for (let i = 0; i < 3; i++) {
    const b = new Sprite(300, 250 - i * 44, 44, 40);
    b.color = 'saddlebrown';
    b.mass = 2;
    b.hits = 2;
    blocks.push(b);
  }
}

function draw() {
  background('skyblue');
  arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);
  if (mouse.released()) {
    const shot = new Sprite(arm.x + 40, arm.y - 10, 18);
    shot.color = 'gray';
    shot.direction = arm.rotation;
    shot.speed = 9;
    shots.push(shot);
  }
  // STEP: shots vs blocks, one hit each, and remove spent blocks.
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.x < -20 || s.x > width + 20 || s.y > height + 20) {
      s.delete();
      shots.splice(i, 1);
    }
  }
  text('blocks ' + blocks.length, 12, 24);
}
