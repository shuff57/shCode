// 6.18.3 Lab: Shots that leave (reference solution).
let base, arm, shots = [];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  base = new Sprite(100, 250, 80, 20, 'static');
  base.color = 'gray';
  arm = new Sprite(100, 210, 80, 12);
  arm.collider = 'none';
  arm.color = 'sienna';
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
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.x < -20 || s.x > width + 20 || s.y > height + 20) {
      s.delete();
      shots.splice(i, 1);
    }
  }
  text('in the air: ' + shots.length, 12, 24);
}
