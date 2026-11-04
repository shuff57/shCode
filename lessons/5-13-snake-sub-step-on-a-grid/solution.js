// 5.13.4 Sub-build: Step on a grid (reference solution).
const CELL = 20;
let x = 100;

function setup() {
  new Canvas(400, 400);
  every(12, () => {
    x += CELL;
    if (x > width - CELL) x = 0;
  });
}

function draw() {
  background('white');
  fill('green');
  rect(x, 200, CELL, CELL);
}
