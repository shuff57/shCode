// 6.19.2 Sub-build: Hits and a budget.
let shots = [], blocks = [];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  const b = new Sprite(300, 220, 40, 40, 'static');
  b.color = 'saddlebrown';
  b.hits = 2;
  blocks.push(b);

  const s = new Sprite(100, 150, 18);
  s.color = 'gray';
  s.direction = 0;
  s.speed = 8;
  shots.push(s);
}

function draw() {
  background('skyblue');
  // STEP: shot vs block, one hit per shot; remove a spent block.
}
