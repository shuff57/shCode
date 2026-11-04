// 6.19.2 Sub-build: Hits and a budget (reference solution).
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
  for (let j = shots.length - 1; j >= 0; j--) {
    for (const b of blocks) {
      if (shots[j].overlaps(b)) {
        b.hits -= 1;
        shots[j].delete();
        shots.splice(j, 1);
        break;
      }
    }
  }
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].hits <= 0) {
      blocks[i].delete();
      blocks.splice(i, 1);
    }
  }
}
