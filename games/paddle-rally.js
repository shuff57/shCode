// Paddle Rally: a paddle-and-ball game for 2, 3 or 4 players.
// Made by Steven Huff.
//
// You may remix this game and change anything you like. Keep the line above
// that says who made it, and add your own name under "Changed by" so the next
// person knows who did what.
//
// Changed by:
//
// How it plays: 2 players guard the left and right sides. A 3rd player guards
// the bottom, and a 4th guards the top. A side with nobody on it is a wall.
// Let the ball past your side and you lose a life. At 0 lives your side turns
// into a wall. The last player left wins.
//
// Two ways to play:
//   One keyboard: press 2, 3 or 4 on the title screen.
//   Online: use the bar above the game to host or join a room. The host's
//   computer runs the game (it moves the ball and every paddle); everyone else
//   sends the keys they press and watches the host's game.

const SIZE = 400;        // the field is a 400 x 400 square
const LIVES = 5;         // lives each player starts with
const PADDLE_LEN = 80;   // how long a paddle is
const THICK = 10;        // how thick a paddle is
const INSET = 20;        // how far a paddle sits in from its edge
const PADDLE_SPEED = 6;  // pixels a paddle moves each frame
const CORNER = 30;       // the grey blocks in the corners are 30 x 30
const R = 7;             // the ball's radius
const START_SPEED = 4;   // the ball's speed after each serve
const MAX_SPEED = 9;     // it speeds up on every hit, up to this

// One entry per side, in player order: player 1 is left, 2 right, 3 bottom, 4 top.
// "along" is true for a paddle that moves left and right (bottom and top).
// back/fwd are that player's keys when everyone shares one keyboard.
const SIDES = [
  { name: 'Left',   color: 'deepskyblue', x: INSET,        y: SIZE / 2,        along: false, back: 'w',  fwd: 's',    keyText: 'W / S' },
  { name: 'Right',  color: 'tomato',      x: SIZE - INSET, y: SIZE / 2,        along: false, back: 'up', fwd: 'down', keyText: '↑ / ↓' },
  { name: 'Bottom', color: 'limegreen',   x: SIZE / 2,     y: SIZE - INSET,    along: true,  back: 'v',  fwd: 'b',    keyText: 'V / B' },
  { name: 'Top',    color: 'gold',        x: SIZE / 2,     y: INSET,           along: true,  back: 'o',  fwd: 'p',    keyText: 'O / P' },
];

let paddles = [];        // paddles[i] is side i's paddle
let inGame = [false, false, false, false];   // is someone playing side i?
let lives = [0, 0, 0, 0];
let corners = [];
let ball;
let vx, vy;              // the ball's speed: pixels per frame across, and down
let speed;
let serveWait;           // frames to wait before the ball moves
let state = 'title';     // 'title', 'play' or 'over'
let winner = -1;

// Online only.
let keys = [0, 0, 0, 0]; // the host's copy of each seat's keys: -1, 0 or 1
let sentKey = 0;         // the last keys this computer sent
let wasOnline = false;   // were we in a room last frame?

function setup() {
  new Canvas(SIZE, SIZE);
  // Up to 4 players online, in real time. The bar above the game hosts and joins rooms.
  multiplayer('versus', 4, { realtime: true });
  online.onMove(gotMove);

  for (const [x, y] of [[0, 0], [SIZE - CORNER, 0], [0, SIZE - CORNER], [SIZE - CORNER, SIZE - CORNER]]) {
    const c = new Sprite(x + CORNER / 2, y + CORNER / 2, CORNER, CORNER, 'static');
    c.color = '#44475a';
    corners.push({ x: x, y: y });
  }
  for (const s of SIDES) {
    const p = s.along
      ? new Sprite(s.x, s.y, PADDLE_LEN, THICK, 'static')
      : new Sprite(s.x, s.y, THICK, PADDLE_LEN, 'static');
    p.color = s.color;
    p.visible = false;
    paddles.push(p);
  }
  ball = new Sprite(SIZE / 2, SIZE / 2, R * 2);
  ball.collider = 'none';
  ball.color = 'white';
  ball.visible = false;
}

// Are we in an online room?
function playingOnline() {
  return online.code !== null && online.status !== 'closed' && online.status !== 'error';
}

// Does THIS computer run the game? On one keyboard, yes. Online, only the host.
function runsTheGame() {
  return !playingOnline() || online.isHost;
}

function draw() {
  background('#1b1d2a');
  if (playingOnline()) sendMyKeys();

  if (state === 'title' || state === 'over') {
    if (!playingOnline()) {
      if (state === 'title' && kb.presses('2')) startLocal(2);
      if (state === 'title' && kb.presses('3')) startLocal(3);
      if (state === 'title' && kb.presses('4')) startLocal(4);
      if (state === 'over' && kb.presses('r')) backToTitle();
    } else if (online.isHost && kb.presses('space')) {
      hostStart();
    }
  } else if (state === 'play' && runsTheGame()) {
    movePaddles();
    if (serveWait > 0) serveWait -= 1;
    else moveBall();
  }

  // We left the room, or the host did: back to the title screen.
  if (wasOnline && !playingOnline()) backToTitle();
  wasOnline = playingOnline();
  drawWalls();
}

// ---- starting a game -------------------------------------------------------

// One keyboard: players 1 to n play.
function startLocal(n) {
  for (let i = 0; i < 4; i++) inGame[i] = i < n;
  startRound();
}

// Online: the host starts a game for everyone in the room right now.
function hostStart() {
  const here = [];
  for (const p of online.players) if (!p.left) here.push(p.seat);
  if (here.length < 2) return;
  online.send({ start: here });
}

// Everyone gets every move, the host's own included, in the same order.
function gotMove(move, from) {
  if (move.k !== undefined && online.isHost) keys[from] = move.k;
  if (from !== 0) return;   // only the host starts games and keeps score
  if (move.start) {
    for (let i = 0; i < 4; i++) inGame[i] = move.start.includes(i);
    if (online.isHost) startRound();
    else { resetLives(); state = 'play'; }
  }
  if (move.lives) {
    lives = move.lives;
    if (move.win >= 0) { winner = move.win; state = 'over'; }
  }
}

function resetLives() {
  for (let i = 0; i < 4; i++) lives[i] = inGame[i] ? LIVES : 0;
  winner = -1;
}

// The computer that runs the game puts the paddles out and serves.
function startRound() {
  resetLives();
  for (let i = 0; i < 4; i++) {
    paddles[i].x = SIDES[i].x;
    paddles[i].y = SIDES[i].y;
    paddles[i].visible = inGame[i];
  }
  ball.visible = true;
  if (playingOnline()) {
    // Every other screen now shows the host's paddles and ball.
    for (const p of paddles) online.share(p);
    online.share(ball);
  }
  serve(randomPlayer());
  state = 'play';
}

function backToTitle() {
  state = 'title';
  winner = -1;
  ball.visible = false;
  for (const p of paddles) p.visible = false;
  for (let i = 0; i < 4; i++) { inGame[i] = false; lives[i] = 0; }
}

// ---- playing ---------------------------------------------------------------

// Is side i still in the game?
function alive(i) {
  return inGame[i] && lives[i] > 0;
}

function randomPlayer() {
  const left = [];
  for (let i = 0; i < 4; i++) if (alive(i)) left.push(i);
  return random(left);
}

// Put the ball in the middle and send it toward side `who` after a short wait.
function serve(who) {
  ball.x = SIZE / 2;
  ball.y = SIZE / 2;
  speed = START_SPEED;
  const slant = random(-0.6, 0.6) * speed;   // a little off straight, so no two serves match
  const name = SIDES[who].name;
  if (name === 'Left')   { vx = -speed; vy = slant; }
  if (name === 'Right')  { vx = speed;  vy = slant; }
  if (name === 'Bottom') { vx = slant;  vy = speed; }
  if (name === 'Top')    { vx = slant;  vy = -speed; }
  serveWait = 60;   // one second
}

// Which way does side i's player want to go: -1, 0 or 1?
function wants(i) {
  if (playingOnline()) return keys[i];
  let d = 0;
  if (kb.pressing(SIDES[i].back)) d -= 1;
  if (kb.pressing(SIDES[i].fwd)) d += 1;
  return d;
}

// Online, each player uses the arrow keys (or WASD) on their own computer.
// Send them only when they change, never every frame.
function sendMyKeys() {
  let d = 0;
  if (kb.pressing('up') || kb.pressing('left') || kb.pressing('w') || kb.pressing('a')) d -= 1;
  if (kb.pressing('down') || kb.pressing('right') || kb.pressing('s') || kb.pressing('d')) d += 1;
  if (d !== sentKey) {
    sentKey = d;
    online.send({ k: d });
  }
}

function movePaddles() {
  const lo = CORNER + PADDLE_LEN / 2;
  const hi = SIZE - CORNER - PADDLE_LEN / 2;
  for (let i = 0; i < 4; i++) {
    if (!alive(i)) continue;
    const p = paddles[i];
    const move = wants(i) * PADDLE_SPEED;
    if (SIDES[i].along) p.x = constrain(p.x + move, lo, hi);
    else p.y = constrain(p.y + move, lo, hi);
  }
}

function moveBall() {
  ball.x += vx;
  ball.y += vy;
  hitPaddles();
  hitCorners();
  // Each edge: a wall bounces the ball back, a player's open side loses them a life.
  if (ball.x < R && vx < 0) reachedSide(0, () => { vx = -vx; });
  if (ball.x > SIZE - R && vx > 0) reachedSide(1, () => { vx = -vx; });
  if (ball.y > SIZE - R && vy > 0) reachedSide(2, () => { vy = -vy; });
  if (ball.y < R && vy < 0) reachedSide(3, () => { vy = -vy; });
}

// The ball reached side i. A wall bounces it; a player misses it.
function reachedSide(i, bounce) {
  if (!alive(i)) { bounce(); return; }
  lives[i] -= 1;
  if (lives[i] === 0) paddles[i].visible = false;
  const left = [];
  for (let j = 0; j < 4; j++) if (alive(j)) left.push(j);
  if (left.length === 1) {
    winner = left[0];
    state = 'over';
    ball.visible = false;
  } else {
    serve(alive(i) ? i : random(left));
  }
  // Online, tell everyone the new lives (and the winner, if there is one).
  if (playingOnline()) online.send({ lives: lives, win: winner });
}

// Does the ball overlap this sprite's rectangle?
function touching(s) {
  return abs(ball.x - s.x) < s.w / 2 + R && abs(ball.y - s.y) < s.h / 2 + R;
}

// Bounce off a paddle. Where it lands on the paddle sets the angle:
// the middle sends it straight back, the ends send it off at a slant.
function hitPaddles() {
  for (let i = 0; i < 4; i++) {
    const p = paddles[i];
    const name = SIDES[i].name;
    if (!alive(i) || !touching(p)) continue;
    let comingIn = false;
    if (name === 'Left') comingIn = vx < 0;
    if (name === 'Right') comingIn = vx > 0;
    if (name === 'Bottom') comingIn = vy > 0;
    if (name === 'Top') comingIn = vy < 0;
    if (!comingIn) continue;
    speed = min(speed + 0.3, MAX_SPEED);
    if (SIDES[i].along) {
      const slant = constrain((ball.x - p.x) / (PADDLE_LEN / 2), -1, 1) * 0.75;
      vx = slant * speed;
      vy = sqrt(speed * speed - vx * vx) * (name === 'Bottom' ? -1 : 1);
    } else {
      const slant = constrain((ball.y - p.y) / (PADDLE_LEN / 2), -1, 1) * 0.75;
      vy = slant * speed;
      vx = sqrt(speed * speed - vy * vy) * (name === 'Left' ? 1 : -1);
    }
  }
}

// Bounce off a corner block: push the ball back out the way it came in.
function hitCorners() {
  for (const c of corners) {
    const inX = ball.x + R > c.x && ball.x - R < c.x + CORNER;
    const inY = ball.y + R > c.y && ball.y - R < c.y + CORNER;
    if (!inX || !inY) continue;
    const outX = min(ball.x + R - c.x, c.x + CORNER - (ball.x - R));
    const outY = min(ball.y + R - c.y, c.y + CORNER - (ball.y - R));
    if (outX < outY) vx = ball.x < c.x + CORNER / 2 ? -abs(vx) : abs(vx);
    else vy = ball.y < c.y + CORNER / 2 ? -abs(vy) : abs(vy);
  }
}

// ---- drawing ---------------------------------------------------------------

// A grey strip along every side that nobody guards.
function drawWalls() {
  noStroke();
  fill('#6272a4');
  if (!alive(0)) rect(0, 0, 4, SIZE);
  if (!alive(1)) rect(SIZE - 4, 0, 4, SIZE);
  if (!alive(2)) rect(0, SIZE - 4, SIZE, 4);
  if (!alive(3)) rect(0, 0, SIZE, 4);
}

function drawTop() {
  textAlign('center');
  if (state === 'title') drawTitle();
  else drawLives();
  if (state === 'over') {
    text('Player ' + (winner + 1) + ' wins!', SIZE / 2, SIZE / 2 - 10, 28, SIDES[winner].color);
    let again = 'Press R to play again';
    if (playingOnline()) again = online.isHost ? 'Press SPACE to play again' : 'Waiting for the host to play again';
    text(again, SIZE / 2, SIZE / 2 + 22, 15, 'white');
  }
  textAlign('left');
}

function drawTitle() {
  text('PADDLE RALLY', SIZE / 2, 110, 32, 'white');
  if (playingOnline()) {
    let here = 0;
    for (const p of online.players) if (!p.left) here += 1;
    const me = SIDES[online.seat];
    text(here + ' of 4 here', SIZE / 2, 160, 16, 'white');
    text('You are Player ' + (online.seat + 1) + ': the ' + me.name + ' side', SIZE / 2, 190, 15, me.color);
    text('Move with the arrow keys or WASD', SIZE / 2, 214, 15, me.color);
    let next = 'Waiting for the host to press SPACE';
    if (online.isHost) next = here < 2 ? 'Waiting for at least one more player' : 'Press SPACE to start with everyone here';
    text(next, SIZE / 2, 260, 15, 'white');
  } else {
    text('One keyboard: press 2, 3 or 4 for players', SIZE / 2, 150, 15, 'white');
    for (let i = 0; i < SIDES.length; i++) {
      const s = SIDES[i];
      text('Player ' + (i + 1) + ': ' + s.name + ' side, ' + s.keyText, SIZE / 2, 185 + i * 24, 15, s.color);
    }
    text('Online: host or join with the bar above', SIZE / 2, 300, 14, '#8393c4');
  }
  text('Made by Steven Huff', SIZE / 2, 345, 12, '#8393c4');
}

// Each player's lives, near their own side.
function drawLives() {
  for (let i = 0; i < 4; i++) {
    if (!inGame[i]) continue;
    const s = SIDES[i];
    const shown = 'P' + (i + 1) + ': ' + (lives[i] > 0 ? lives[i] : 'out');
    if (s.name === 'Left') text(shown, 70, SIZE / 2 + 5, 14, s.color);
    if (s.name === 'Right') text(shown, SIZE - 70, SIZE / 2 + 5, 14, s.color);
    if (s.name === 'Bottom') text(shown, SIZE / 2, SIZE - 45, 14, s.color);
    if (s.name === 'Top') text(shown, SIZE / 2, 55, 14, s.color);
  }
}
