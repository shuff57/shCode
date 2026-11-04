// 5.14.4 Debugging: The snake that never grows (starter, with both bugs).
const CELL = 20;
let headX = 100, headY = 200;
let body = [];

function setup() {
  new Canvas(400, 400);
  every(12, () => {
    // BUG 1: the old cell is never kept.
    headX += CELL;
    if (headX > width - CELL) headX = 0;
    // BUG 2: always drop the tail.
    body.pop();
  });
}

function draw() {
  background('white');
  fill('green');
  for (const seg of body) rect(seg.x, seg.y, CELL, CELL);
  rect(headX, headY, CELL, CELL);
}
