// 6.26.3 Challenges: Make it yours (reference: challenge 3, a B square).
// Trail: a race along a path of squares. Two players take turns rolling a die;
// first to the last square wins. Special squares: J jumps ahead 3, S slides
// back 3, W makes you wait a turn, B sends you back to the start. Online: H
// hosts a room; to join a classmate, put their code in JOIN and run.

const TRACK = '....J....S..W..J...B.S..W.J.S.F';   // one letter per square
const COLS = 10;          // squares per row; the path snakes back on each new row
const SIZE = 56;          // each square is 56 by 56 pixels
const TOP = 60;           // the words live in the strip above the board

const JOIN = '';          // a classmate's room code, e.g. 'K7QX2M'

let path;                 // path[i] is { x, y, kind } for square i
let players;              // players[p] is { name, color, at, waiting }
let turn = 0;             // whose turn: an index into players
let lastRoll = 0;
let message = 'Press SPACE to roll';
let winner = -1;          // -1 until someone reaches the end

function setup() {
  new Canvas(COLS * SIZE, TOP + 4 * SIZE);
  randomSeed(Date.now());   // a fresh start for the die on every Run
  path = makePath(TRACK);
  newGame();
  online.onMove((move, seat) => {
    // Every computer runs this for every move, so every computer ignores the same
    // bad ones: a move from a seat whose turn it is not, or a roll that is no die.
    if (seat === turn && winner === -1 && goodRoll(move.roll)) takeTurn(move.roll);
  });
  if (JOIN !== '') online.join(JOIN);
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
  if (kb.presses('h') && (online.status === 'off' || online.status === 'closed')) {
    newGame();          // a room starts from a fresh board, the same one the guest starts with
    online.host();
  }
  if (kb.presses('space') && winner === -1 && myTurn()) roll();
  if (kb.presses('r') && winner !== -1 && online.status === 'off') newGame();
  drawBoard();
  drawPlayers();
}

// Online, only the player whose seat matches the turn may roll. Offline,
// whoever is at the keyboard rolls for whoever's turn it is.
function myTurn() {
  if (online.status === 'off') return true;
  return online.status === 'ready' && online.seat === turn;
}

// A die roll is a whole number from 1 to 6. Anything else makes no sense.
function goodRoll(r) {
  return floor(r) === r && r >= 1 && r <= 6;
}

function roll() {
  const r = floor(random(1, 7));
  if (online.status === 'off') takeTurn(r);
  else online.send({ roll: r });   // applied in onMove, on both computers
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
  if (kind === 'B') { p.at = 0; message += ', back to the start'; }
  if (p.at === last) {
    winner = turn;
    message = p.name + ' wins!' + (online.status === 'off' ? ' Press R to play again' : ' Run again and host a new room to play again');
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

const COLORS = { '.': '#2d3045', J: '#2e7d4f', S: '#9c3b3b', W: '#8a6d1f', F: '#c9a227', B: '#5b3f8c' };

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
  text(message, 10, 24, winner === -1 ? 18 : 14, 'white');
  if (online.status === 'error') {
    // cut short so the words stay in the strip above the board
    text(('' + online.error).slice(0, 80), 10, 48, 12, 'tomato');
    return;
  }
  if (winner === -1) text(p.name + "'s turn", 10, 48, 16, p.color);
  if (online.status === 'waiting') text('Room ' + online.code + ': waiting', 360, 48, 14, 'gold');
  if (online.status === 'ready') text('Online, you are ' + players[online.seat].name, 300, 48, 14, 'gold');
  if (online.status === 'closed') text('Room closed: H for a new one', 300, 48, 14, 'gold');
  if (online.status === 'off') text('H: host online', 420, 48, 14, '#8393c4');
}
