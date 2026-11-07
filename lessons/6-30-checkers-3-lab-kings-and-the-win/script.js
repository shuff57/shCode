// 6.30.3 Lab: Kings, and the win.
// Checkers: two players, one board. Your game from 6.29.3: pieces step, jump
// and jump again. Today a piece is crowned, and a player with no move loses.

const N = 8;              // 8 rows and 8 columns
const CELL = 60;          // each square is 60 by 60 pixels
const TOP = 50;           // the words live in the strip above the board

let grid;                 // grid[r][c]: '' empty, 'r' red, 'b' black
let turn = 'r';           // whose turn: 'r' or 'b'
let picked = null;        // the selected piece, { r, c }, or null
let chain = false;        // true while the piece that just jumped must jump again
// STEP: a winner, '' until someone wins.
let message = '';

function setup() {
  new Canvas(N * CELL, TOP + N * CELL);
  newGame();
}

function newGame() {
  grid = makeBoard();
  turn = 'r';
  picked = null;
  chain = false;
  message = "Red's turn: click a piece";
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

// STEP: a king is 'R' or 'B'; it still belongs to its colour. Add isKing(p).
function colorOf(p) { return p; }                      // 'r' or 'b' ('' for empty)
function nameOf(t) { return t === 'r' ? 'Red' : 'Black'; }
function onBoard(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

// What moving the piece at (fr, fc) to (tr, tc) would be: 'step', 'jump', or
// '' when it is not allowed. Red moves up the screen (rows get smaller),
// black moves down.
function moveKind(fr, fc, tr, tc) {
  if (!onBoard(fr, fc) || !onBoard(tr, tc)) return '';
  const p = grid[fr][fc];
  if (p === '' || colorOf(p) !== turn || grid[tr][tc] !== '') return '';
  const dr = tr - fr;
  const dc = tc - fc;
  if (abs(dr) !== abs(dc)) return '';
  const ahead = turn === 'r' ? dr < 0 : dr > 0;
  // STEP: a king may also move backward.
  if (!ahead) return '';
  if (abs(dr) === 1) return 'step';
  if (abs(dr) === 2) {
    const mid = grid[fr + dr / 2][fc + dc / 2];
    if (mid !== '' && colorOf(mid) !== turn) return 'jump';
  }
  return '';
}

// Allowed right now: during a chain only the piece that jumped, and only a jump.
function isLegal(fr, fc, tr, tc) {
  const kind = moveKind(fr, fc, tr, tc);
  if (kind === '') return false;
  if (chain) return kind === 'jump' && fr === picked.r && fc === picked.c;
  return true;
}

// STEP: hasAnyMove(): does the player whose turn it is have any move at all?

function canJumpFrom(r, c) {
  for (const dr of [-2, 2]) {
    for (const dc of [-2, 2]) {
      if (moveKind(r, c, r + dr, c + dc) === 'jump') return true;
    }
  }
  return false;
}

function doMove(fr, fc, tr, tc) {
  const kind = moveKind(fr, fc, tr, tc);
  grid[tr][tc] = grid[fr][fc];
  grid[fr][fc] = '';
  if (kind === 'jump') grid[(fr + tr) / 2][(fc + tc) / 2] = '';
  // STEP: crown a piece on the far row; crowning ends the turn, even mid-chain.
  if (kind === 'jump' && canJumpFrom(tr, tc)) {
    picked = { r: tr, c: tc };
    chain = true;
    message = nameOf(turn) + ' jumps again!';
    return;
  }
  picked = null;
  chain = false;
  turn = turn === 'r' ? 'b' : 'r';
  message = nameOf(turn) + "'s turn";
}

function draw() {
  background('#1b1d2a');
  // STEP: no clicks once someone has won; R starts a new game.
  if (mouse.presses()) clickAt(mouse.x, mouse.y);
  drawBoard();
  drawPieces();
}

// A click is a pixel: turn it into a row and a column. Your own piece is
// picked up; a legal square for the picked piece is a move.
function clickAt(x, y) {
  const c = floor(x / CELL);
  const r = floor((y - TOP) / CELL);
  if (!onBoard(r, c)) return;
  const p = grid[r][c];
  if (!chain && p !== '' && colorOf(p) === turn) {
    picked = { r: r, c: c };
    return;
  }
  if (picked !== null && isLegal(picked.r, picked.c, r, c)) doMove(picked.r, picked.c, r, c);
}

function drawBoard() {
  noStroke();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
      rect(c * CELL, TOP + r * CELL, CELL, CELL);
    }
  }
  if (picked !== null) {
    fill('rgba(255, 215, 0, 0.45)');
    rect(picked.c * CELL, TOP + picked.r * CELL, CELL, CELL);
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
  text(message, 10, 22, 16, 'white');
}
