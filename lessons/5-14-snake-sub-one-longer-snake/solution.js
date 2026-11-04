// 5.14.2 Sub-build: One longer snake (reference solution).
const CELL = 20;
let headX = 100, headY = 200;
let body = [];

function setup() {
  new Canvas(400, 400);
  every(12, () => {
    body.unshift({ x: headX, y: headY });
    if (body.length > 4) body.pop();
    headX += CELL;
    if (headX > width - CELL) headX = 0;
  });
}

function draw() {
  background('white');
  fill('green');
  rect(headX, headY, CELL, CELL);
  for (const seg of body) {
    rect(seg.x, seg.y, CELL, CELL);
  }
}
