// Sub-build: a path from a list. Six squares, each one an { x, y } in a list;
// the picture is drawn from the list, and each square shows its number.

let path = [
  { x: 60, y: 60 },
  { x: 140, y: 60 },
  { x: 220, y: 60 },
  { x: 220, y: 140 },
  { x: 140, y: 140 },
  { x: 60, y: 140 },
];

function setup() {
  new Canvas(300, 220);
}

function draw() {
  background('#1b1d2a');
  for (let i = 0; i < path.length; i++) {
    fill('#2d3045');
    rect(path[i].x - 30, path[i].y - 30, 60, 60, 6);
    text(String(i), path[i].x - 5, path[i].y + 6, 16, 'white');
  }
}
