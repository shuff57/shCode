// Trail: a race along a path of squares. Day one: the board, and one token
// that steps along it, to prove the path runs in the right order.

const TRACK = '....J....S..W..J.....S..W.J.S.F';   // one letter per square
const COLS = 10;          // squares per row; the path snakes back on each new row
const SIZE = 56;          // each square is 56 by 56 pixels
const TOP = 60;           // the words live in the strip above the board

let path;                 // path[i] is { x, y, kind } for square i
let at = 0;               // which square the token is on

function setup() {
  new Canvas(COLS * SIZE, TOP + 4 * SIZE);
  path = makePath(TRACK);
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
  if (kb.presses('space') && at < path.length - 1) at += 1;
  drawBoard();
  fill('tomato');
  circle(path[at].x, path[at].y + 14, 18);
}

const COLORS = { '.': '#2d3045', J: '#2e7d4f', S: '#9c3b3b', W: '#8a6d1f', F: '#c9a227' };

function drawBoard() {
  for (let i = 0; i < path.length; i++) {
    const s = path[i];
    fill(COLORS[s.kind]);
    rect(s.x - SIZE / 2 + 2, s.y - SIZE / 2 + 2, SIZE - 4, SIZE - 4, 6);
  }
}

function drawTop() {
  text('Square ' + at + ' of ' + (path.length - 1), 10, 24, 18, 'white');
  text('SPACE: step forward', 10, 48, 14, '#8393c4');
}
