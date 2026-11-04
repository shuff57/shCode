// 6.18.2 Sub-build: Out and gone.
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
  text('in the air: ' + shots.length, 12, 24);
  // STEP: sweep the list backwards, delete and splice what has left.
}
