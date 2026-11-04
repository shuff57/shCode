// 5.14.4 Debugging: The snake that never grows (reference solution).
const CELL = 20;
let headX = 100, headY = 200;
let body = [];
let growing = false;

function setup() {
  new Canvas(400, 400);
  every(12, () => {
    body.unshift({ x: headX, y: headY });
    if (!growing) body.pop();
    growing = false;
    headX += CELL;
    if (headX > width - CELL) headX = 0;
  });
}

function draw() {
  background('white');
  fill('green');
  for (const seg of body) rect(seg.x, seg.y, CELL, CELL);
  rect(headX, headY, CELL, CELL);
}
