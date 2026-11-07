// 6.25.3 Lab: Trail online.
// Trail: a race along a path of squares. Your game from 6.24.3: two players take
// turns, and J, S and W do something. Today it plays a classmate on another computer.

const TRACK = '....J....S..W..J.....S..W.J.S.F';   // one letter per square
const COLS = 10;          // squares per row; the path snakes back on each new row
const SIZE = 56;          // each square is 56 by 56 pixels
const TOP = 60;           // the words live in the strip above the board

// STEP: a JOIN code: '' to host, or a classmate's room code to join.

let path;                 // path[i] is { x, y, kind } for square i
let players;              // players[p] is { name, color, at, waiting }
let turn = 0;             // whose turn: an index into players
let lastRoll = 0;
let message = 'Press SPACE to roll';
let winner = -1;          // -1 until someone reaches the end

function setup() {
  new Canvas(COLS * SIZE, TOP + 4 * SIZE);
  path = makePath(TRACK);
  newGame();
  // STEP: apply every move in onMove; join a room if JOIN has a code.
}

function newGame() {
  players = [
    { name: 'Red', color: 'tomato', at: 0, waiting: false },
    { name: 'Blue', color: 'dodgerblue', at: 0, waiting: false },
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
  // STEP: H hosts. SPACE rolls only on your turn; R only when offline.
  if (kb.presses('space') && winner === -1) roll();
  if (kb.presses('r') && winner !== -1) newGame();
  drawBoard();
  drawPlayers();
}

function roll() {
  // STEP: offline, take the turn here; online, send the roll instead.
  takeTurn(floor(random(1, 7)));
}

// One turn, from a roll: move, then do what the square says, then pass on.
function takeTurn(r) {
  const p = players[turn];
  lastRoll = r;
  const last = path.length - 1;
  p.at = min(p.at + r, last);
  const kind = path[p.at].kind;
  message = p.name + ' rolled ' + r;
  if (kind === 'J') { p.at = min(p.at + 3, last); message += ', jumped ahead 3'; }
  if (kind === 'S') { p.at = max(p.at - 3, 0); message += ', slid back 3'; }
  if (kind === 'W') { p.waiting = true; message += ', waits a turn'; }
  if (p.at === last) {
    winner = turn;
    message = p.name + ' wins! Press R to play again';
    return;
  }
  nextTurn();
}

function nextTurn() {
  turn = (turn + 1) % players.length;
  if (players[turn].waiting) {
    players[turn].waiting = false;
    message += '. ' + players[turn].name + ' waits';
    turn = (turn + 1) % players.length;
  }
}

const COLORS = { '.': '#2d3045', J: '#2e7d4f', S: '#9c3b3b', W: '#8a6d1f', F: '#c9a227' };

function drawBoard() {
  for (let i = 0; i < path.length; i++) {
    const s = path[i];
    fill(COLORS[s.kind]);
    rect(s.x - SIZE / 2 + 2, s.y - SIZE / 2 + 2, SIZE - 4, SIZE - 4, 6);
    if (s.kind !== '.') text(s.kind, s.x - 5, s.y + 6, 16, 'white');
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
  // STEP: show the room code, who you are online, and any error.
}
