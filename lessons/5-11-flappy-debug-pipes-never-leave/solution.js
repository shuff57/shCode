// 5.11.4 Debugging: The pipes that never leave (reference solution).
let pipes = [];

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
  for (let i = pipes.length - 1; i >= 0; i--) {
    if (pipes[i].x < -40) {
      pipes[i].delete();
      pipes.splice(i, 1);
    }
  }
  text('pipes ' + pipes.length, 12, 24);
}
