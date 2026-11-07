// Checkers: two players, one board. Day one: the board and the pieces, drawn
// from a grid of letters.

const N = 8;              // 8 rows and 8 columns
const CELL = 60;          // each square is 60 by 60 pixels
const TOP = 50;           // the words live in the strip above the board

let grid;                 // grid[r][c]: '' empty, 'r' red, 'b' black

function setup() {
  new Canvas(N * CELL, TOP + N * CELL);
  newGame();
}

function newGame() {
  grid = makeBoard();
}

// Pieces sit on the dark squares, where (r + c) is odd: black on the top
// three rows, red on the bottom three.
function makeBoard() {
  const g = [];
  for (let r = 0; r < N; r++) {
    const row = [];
    for (let c = 0; c < N; c++) {
      let p = '';
      if ((r + c) % 2 === 1 && r < 3) p = 'b';
      if ((r + c) % 2 === 1 && r > 4) p = 'r';
      row.push(p);
    }
    g.push(row);
  }
  return g;
}

function colorOf(p) { return p; }                      // 'r' or 'b' ('' for empty)

function draw() {
  background('#1b1d2a');
  drawBoard();
  drawPieces();
}

function drawBoard() {
  noStroke();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
      rect(c * CELL, TOP + r * CELL, CELL, CELL);
    }
  }
}

function drawPieces() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = grid[r][c];
      if (p === '') continue;
      const x = c * CELL + CELL / 2;
      const y = TOP + r * CELL + CELL / 2;
      fill(colorOf(p) === 'r' ? '#ffd2c8' : '#9a9a9a');
      circle(x, y, CELL * 0.8);
      fill(colorOf(p) === 'r' ? 'tomato' : '#262626');
      circle(x, y, CELL * 0.68);
    }
  }
}

function drawTop() {
  text('Checkers: ' + countPieces('r') + ' red, ' + countPieces('b') + ' black', 10, 22, 16, 'white');
}

// How many pieces of one colour are on the board?
function countPieces(t) {
  let n = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (colorOf(grid[r][c]) === t) n += 1;
    }
  }
  return n;
}
