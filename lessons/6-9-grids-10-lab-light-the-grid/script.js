// 6.9.10 Lab: Light the grid.

const COLS = 8;
const ROWS = 8;
const CELL = 50;      // each cell is 50 by 50 pixels
const TOP = 40;       // the grid starts 40 pixels down; the words live in the strip above it

let grid;             // grid[r][c] is true when that cell is lit

function setup() {
  new Canvas(400, 440);   // a 40 pixel strip for words on top, then 400 by 400 for the grid
  grid = makeGrid();
}

// A grid of ROWS rows with COLS cells each, every cell off (false).
function makeGrid() {
  const g = [];
  // STEP 1: build the grid. For each of ROWS rows make an empty row, push
  //   COLS values of false into it, then push the row onto g.
  return g;
}

function draw() {
  background('#111');
  if (mouse.presses()) clickCell(mouse.x, mouse.y);
  drawGrid();
}

// The picture is drawn FROM the data: a lit cell is gold, an off cell is dark.
function drawGrid() {
  // STEP 2: draw the grid from the data. Two loops over every cell: fill gold
  //   when grid[r][c] is true and a dark colour when it is false, then rect(c *
  //   CELL, TOP + r * CELL, CELL, CELL).
}

// A click is a pixel. Turn it into a row and a column, and flip that cell if it is on the grid.
function clickCell(x, y) {
  // STEP 3: turn the click into a column and a row with floor, CELL and TOP
  //   (take TOP off y first). If that row and column are on the grid, flip the
  //   cell: grid[r][c] = !grid[r][c].
}

// How many cells are lit right now?
function countLit() {
  let n = 0;
  // STEP 4: count the lit cells. Two loops over the grid, adding 1 to n for
  //   every cell that is true.
  return n;
}

function drawTop() {
  fill('white');
  textSize(16);
  text('lit: ' + countLit() + ' of ' + (ROWS * COLS), 12, 24);
}
