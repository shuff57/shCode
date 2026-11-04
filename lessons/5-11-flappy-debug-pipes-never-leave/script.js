// 5.11.4 Debugging: The pipes that never leave (starter, with both bugs).
let pipes = [];
let count = 0;

function setup() {
  new Canvas(400, 400);
  every(90, () => {
    const p = new Sprite(430, 200, 60, 120, 'static');
    p.color = 'green';
    p.vel.x = -2;
    pipes.push(p);
  });
}

function draw() {
  background('skyblue');
  // BUG 2: forwards.
  for (let i = 0; i < pipes.length; i++) {
    if (pipes[i].x < -40) {
      // BUG 1: deleted, never spliced.
      pipes[i].delete();
    }
  }
  text('pipes ' + pipes.length, 12, 24);
}
