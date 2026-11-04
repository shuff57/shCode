// 6.20.2 Debugging: The wall that falls on its own (starter, with both bugs).
let shots = [], blocks = [];
let shotsLeft = 5;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  for (let i = 0; i < 3; i++) {
    const b = new Sprite(300, 250 - i * 44, 44, 40);
    b.color = 'saddlebrown';
    b.mass = 2;
    b.hits = 2;
    // BUG 1: a dynamic bottom block cannot hold the stack.
    blocks.push(b);
  }
}

function draw() {
  background('skyblue');
  text('shots ' + shotsLeft, 12, 24);

  // BUG 2: the end check runs before the sweep.
  if (shotsLeft === 0 && shots.length === 0) text('Out of shots', 150, 120);

  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.x < -20 || s.x > width + 20 || s.y > height + 20) {
      s.delete();
      shots.splice(i, 1);
    }
  }
}
