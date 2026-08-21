// 2.4.32 A2.4.2 — Print a Grid Pattern
//
// Dimensions are variables, so the grid resizes without touching
// the loops.
let rows = 5;
let cols = 5;

for (let row = 0; row < rows; row++) {
  let line = "";
  for (let col = 0; col < cols; col++) {
    line = line + "#";
  }
  console.log(line);
}
