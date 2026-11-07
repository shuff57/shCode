// Trail: a race along a path of squares. Two players take turns rolling a die;
// first to the last square wins.

const TRACK = '....J....S..W..J.....S..W.J.S.F';   // one letter per square
const COLS = 10;          // squares per row; the path snakes back on each new row
const SIZE = 56;          // each square is 56 by 56 pixels
const TOP = 60;           // the words live in the strip above the board

let path;                 // path[i] is { x, y, kind } for square i
let players;              // players[p] is { name, color, at }
let turn = 0;             // whose turn: an index into players
let lastRoll = 0;
let message = 'Press SPACE to roll';
let winner = -1;          // -1 until someone reaches the end

function setup() {
  new Canvas(COLS * SIZE, TOP + 4 * SIZE);
  randomSeed(Date.now());   // a fresh start for the die on every Run
  path = makePath(TRACK);
  newGame();
}

function newGame() {
  players = [
    { name: 'Red', color: 'tomato', at: 0 },
    { name: 'Blue', color: 'dodgerblue', at: 0 },
  ];
  turn = 0;
  winner = -1;
  lastRoll = 0;
  message = 'Press SPACE to roll';
}

// The track is text; the path is data made from it. Row r runs left to right
// when r is even and right to left when r is odd, so the squares snake.
function makePath(track) {
  const squares = [];
  for (let i = 0; i < track.length; i++) {
    const r = floor(i / COLS);
    let c = i % COLS;
    if (r % 2 === 1) c = COLS - 1 - c;
    squares.push({ x: c * SIZE + SIZE / 2, y: TOP + r * SIZE + SIZE / 2, kind: track[i] });
  }
  return squares;
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('space') && winner === -1) roll();
  if (kb.presses('r') && winner !== -1) newGame();
  drawBoard();
  drawPlayers();
}

function roll() {
  takeTurn(floor(random(1, 7)));
}

// One turn, from a roll: move, then pass on.
function takeTurn(r) {
  const p = players[turn];
  lastRoll = r;
  const last = path.length - 1;
  p.at = min(p.at + r, last);
  message = p.name + ' rolled ' + r;
  if (p.at === last) {
    winner = turn;
    message = p.name + ' wins! Press R to play again';
    return;
  }
  nextTurn();
}

function nextTurn() {
  turn = (turn + 1) % players.length;
}

const COLORS = { '.': '#2d3045', J: '#2e7d4f', S: '#9c3b3b', W: '#8a6d1f', F: '#c9a227' };

function drawBoard() {
  for (let i = 0; i < path.length; i++) {
    const s = path[i];
    fill(COLORS[s.kind]);
    rect(s.x - SIZE / 2 + 2, s.y - SIZE / 2 + 2, SIZE - 4, SIZE - 4, 6);
  }
}

function drawPlayers() {
  for (let p = 0; p < players.length; p++) {
    const s = path[players[p].at];
    fill(players[p].color);
    circle(s.x - 10 + p * 20, s.y + 14, 18);
  }
}

function drawTop() {
  const p = players[turn];
  text(message, 10, 24, 18, 'white');
  if (winner === -1) text(p.name + "'s turn", 10, 48, 16, p.color);
}
