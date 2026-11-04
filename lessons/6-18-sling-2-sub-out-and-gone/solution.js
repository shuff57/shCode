// 6.18.2 Sub-build: Out and gone (reference solution).
let shots = [];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;
  const s = new Sprite(100, 150, 18);
  s.color = 'gray';
  s.speed = 6;
  s.direction = 0;
  shots.push(s);
}

function draw() {
  background('skyblue');
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.x < -20 || s.x > width + 20 || s.y > height + 20) {
      s.delete();
      shots.splice(i, 1);
    }
  }
  text('in the air: ' + shots.length, 12, 24);
}
