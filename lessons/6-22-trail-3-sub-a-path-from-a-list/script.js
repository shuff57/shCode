// 6.22.3 Sub-build: A path from a list.
// Six squares, each one an { x, y } in a list. Draw the picture from the list.

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
  // STEP: loop over path. Draw a square at each { x, y }, and write its number on it.
}
