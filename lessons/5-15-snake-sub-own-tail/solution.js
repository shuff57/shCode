// 5.15.2 Sub-build: Am I in my own tail? (reference solution).
const CELL = 20;
let headX = 100, headY = 200;
let body = [{ x: 80, y: 200 }, { x: 60, y: 200 }];
let lost = false;

function setup() {
  new Canvas(400, 400);
  every(12, () => {
    if (lost) return;
    const nextX = headX + CELL;
    const nextY = headY;
    for (const seg of body) {
      if (seg.x === nextX && seg.y === nextY) {
        lost = true;
      }
    }
    if (lost) return;
    body.unshift({ x: headX, y: headY });
    body.pop();
    headX = nextX;
  });
}

function draw() {
  background('white');
  fill(lost ? 'gray' : 'green');
  for (const seg of body) rect(seg.x, seg.y, CELL, CELL);
  rect(headX, headY, CELL, CELL);
}
