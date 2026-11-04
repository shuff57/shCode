// 5.15.4 Debugging: The tail that never bites (starter, with both bugs).
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

    // BUG 1 and 2: one segment, and the current cell.
    if (body[0].x === headX && body[0].y === headY) {
      lost = true;
    }

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
