// 6.9.10 Lab: Light the grid (reference solution).

const COLS = 8;
const ROWS = 8;
const CELL = 50;      // each cell is 50 by 50 pixels

let grid;             // grid[r][c] is true when that cell is lit

function setup() {
  new Canvas(400, 440);   // 400 by 400 for the grid, a strip underneath for words
  grid = makeGrid();
}

// A grid of ROWS rows with COLS cells each, every cell off (false).
function makeGrid() {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(false);
    }
    g.push(row);
  }
  return g;
}

function draw() {
  background('#111');
  if (mouse.presses()) clickCell(mouse.x, mouse.y);
  drawGrid();
}

// The picture is drawn FROM the data: a lit cell is gold, an off cell is dark.
function drawGrid() {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      fill(grid[r][c] ? 'gold' : '#334');
      rect(c * CELL, r * CELL, CELL, CELL);
    }
  }
}

// A click is a pixel. Turn it into a row and a column, and flip that cell if it is on the grid.
function clickCell(x, y) {
  const c = floor(x / CELL);
  const r = floor(y / CELL);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
    grid[r][c] = !grid[r][c];
  }
}

// How many cells are lit right now?
function countLit() {
  let n = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c]) n += 1;
    }
  }
  return n;
}

function drawTop() {
  fill('white');
  textSize(16);
  text('lit: ' + countLit() + ' of ' + (ROWS * COLS), 12, 428);
}
