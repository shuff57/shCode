// 5.13.4 Sub-build: Step on a grid.
// The block drifts right, smoothly and off the screen. A snake steps.

const CELL = 20;
let x = 100;

function setup() {
  new Canvas(400, 400);
  // STEP 1: every 12 frames, move x one cell and keep it on the canvas.
}

function draw() {
  background('white');
  fill('green');
  rect(x, 200, CELL, CELL);
}
