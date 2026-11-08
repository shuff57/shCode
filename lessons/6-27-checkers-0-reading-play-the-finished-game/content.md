## Play the finished game

**Read before `6.27.1 Plan: Break checkers into parts`.** About 5 minutes. There is nothing to write here: you play.

By the end of this you should be able to answer:

- What does a finished checkers game have that a checkered board does not?
- Which of those parts do you build in the next six modules (6.27 to 6.32)?

Checkers looks like one idea and is really five: a board that is a grid of letters, a click that becomes a row and a column, jumps that take a piece (and jump again), kings and a player with no move left, and one rule check that runs on both computers. The next six modules build them one at a time. Before you start, play the game you are building towards. The code is hidden on purpose: you are not expected to read it yet.

**Try it:** press **Play**. The title screen says the two ways to play, and the controls are in the table below the game.

```js live demo size=420x506 id=checkers-finished-game
// CHECKERS: the finished demo students play before they build their own (6.27-6.32).
//
// The core is exactly the chain's game: a grid of letters built with two loops,
// a click turned into a row and a column, a step or a jump checked by one rule
// (moveKind), jumping again with the same piece, kings, and a win when the
// other side has no move. Online goes through multiplayer('versus', 2): the
// lobby bar above the game hosts and joins, every move is sent, and onMove runs
// the SAME rule check on both computers before it changes anything. On one
// computer, L starts a game where whoever is at the mouse plays both colours.
// On top: a title screen, a winner panel, legal squares shown, sliding pieces,
// a star on every king, the board turned round for Black, and sound.
//
// Controls:  click a piece, then a square   L = play on this computer   R = rematch

const N = 8;
const CELL = 50;
const TOP = 56;                 // the words live in the strip above the board
const W = N * CELL;             // 400
const H = TOP + N * CELL + 30;  // 486

let grid;                       // grid[r][c]: '' empty, 'r' red, 'b' black, 'R' and 'B' kings
let side = 'r';                 // whose turn: 'r' or 'b'
let picked = null;              // the selected piece, { r, c }
let chain = false;              // true while the piece that just jumped must jump again
let winner = '';
let message = '';
let lastMove = null;

let phase = 'title';            // 'title' | 'local' | 'online'
let log = [];                   // every move this room has sent, in order
let quiet = false;              // true while the log replays: no sound, no animation
let slides = [];                // pieces sliding into place (display only)
let stars = [];
let cheered = false;
let snd = {};

function setup() {
  new Canvas(W, H);
  multiplayer('versus', 2);
  nextTurn();                   // turn is 1 until the lobby puts us in a room (see follow)
  online.onMove((m, who) => {
    follow();
    log.push({ m: m, who: who });
    if (phase === 'online') applyMove(m, who);
  });
  for (const name of ['step', 'pop', 'crown', 'win', 'select', 'blip']) {
    snd[name] = loadSound('/moshion/assets/' + name + '.wav');
  }
  for (let i = 0; i < 12; i++) {
    const s = new Sprite(-50, -50, 26, 26);
    s.collider = 'none';
    s.texture = 'star';
    s.layer = 5;
    s.visible = false;
    stars.push(s);
  }
  newGame();
}

function newGame() {
  grid = makeBoard();
  side = 'r';
  picked = null;
  chain = false;
  winner = '';
  lastMove = null;
  message = 'Red moves first';
  slides = [];
  cheered = false;
}

// Pieces sit on the dark squares, where (r + c) is odd.
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

function colorOf(p) { return p.toLowerCase(); }
function isKing(p) { return p === 'R' || p === 'B'; }
function nameOf(t) { return t === 'r' ? 'Red' : 'Black'; }
function onBoard(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
function seatOf(t) { return t === 'r' ? 0 : 1; }      // the host plays red

// 'step', 'jump', or '' when the move is not allowed.
function moveKind(fr, fc, tr, tc) {
  if (!onBoard(fr, fc) || !onBoard(tr, tc)) return '';
  const p = grid[fr][fc];
  if (p === '' || colorOf(p) !== side || grid[tr][tc] !== '') return '';
  const dr = tr - fr;
  const dc = tc - fc;
  if (abs(dr) !== abs(dc)) return '';
  const ahead = side === 'r' ? dr < 0 : dr > 0;
  if (!ahead && !isKing(p)) return '';
  if (abs(dr) === 1) return 'step';
  if (abs(dr) === 2) {
    const mid = grid[fr + dr / 2][fc + dc / 2];
    if (mid !== '' && colorOf(mid) !== side) return 'jump';
  }
  return '';
}

function isLegal(fr, fc, tr, tc) {
  const kind = moveKind(fr, fc, tr, tc);
  if (kind === '') return false;
  if (chain) return kind === 'jump' && fr === picked.r && fc === picked.c;
  return true;
}

function canJumpFrom(r, c) {
  for (const dr of [-2, 2]) for (const dc of [-2, 2]) if (moveKind(r, c, r + dr, c + dc) === 'jump') return true;
  return false;
}

function hasAnyMove() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    for (const d of [-2, -1, 1, 2]) {
      if (moveKind(r, c, r + d, c + d) !== '' || moveKind(r, c, r + d, c - d) !== '') return true;
    }
  }
  return false;
}

// A move must be four whole numbers on the board; anything else is ignored.
function isSquare(r, c) { return typeof r === 'number' && typeof c === 'number' && floor(r) === r && floor(c) === c && onBoard(r, c); }
function goodMove(m) { return m !== null && typeof m === 'object' && isSquare(m.fr, m.fc) && isSquare(m.tr, m.tc); }

// The one place a move changes the game. Both computers run it for every move,
// with the same checks, so a wrong-seat or impossible move changes nothing anywhere.
function applyMove(m, who) {
  if (m === null || typeof m !== 'object') return;
  if (m.again === 1 && winner !== '') { newGame(); return; }
  if (goodMove(m) && who === seatOf(side) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) {
    doMove(m.fr, m.fc, m.tr, m.tc);
  }
}

function doMove(fr, fc, tr, tc) {
  const kind = moveKind(fr, fc, tr, tc);
  const piece = grid[fr][fc];
  grid[tr][tc] = piece;
  grid[fr][fc] = '';
  if (kind === 'jump') {
    const mr = (fr + tr) / 2;
    const mc = (fc + tc) / 2;
    grid[mr][mc] = '';
  }
  const crowned = crown(tr, tc);
  lastMove = { fr: fr, fc: fc, tr: tr, tc: tc };
  if (!quiet) {
    slides.push({ fr: fr, fc: fc, tr: tr, tc: tc, t: 0 });
    if (crowned) snd.crown.play();
    else if (kind === 'jump') snd.pop.play();
    else snd.step.play();
  }
  if (kind === 'jump' && !crowned && canJumpFrom(tr, tc)) {
    picked = { r: tr, c: tc };
    chain = true;
    message = nameOf(side) + ' jumps again with the same piece!';
    return;
  }
  picked = null;
  chain = false;
  side = side === 'r' ? 'b' : 'r';
  message = crowned ? nameOf(side === 'r' ? 'b' : 'r') + ' has a new king' : nameOf(side) + "'s move";
  if (!hasAnyMove()) {
    winner = side === 'r' ? 'b' : 'r';
    message = nameOf(side) + ' has no move left';
  }
}

function crown(r, c) {
  const p = grid[r][c];
  if (p === 'r' && r === 0) { grid[r][c] = 'R'; return true; }
  if (p === 'b' && r === N - 1) { grid[r][c] = 'B'; return true; }
  return false;
}

function myMove() {
  if (winner !== '' || slides.length > 0) return false;
  if (phase === 'local') return true;
  return phase === 'online' && game.ready && online.seat === seatOf(side);
}

// Black's player sees the board turned round, so their own pieces are at the bottom.
function flipped() { return phase === 'online' && online.seat === 1; }
function screenOf(r, c) {
  const f = flipped();
  const rr = f ? N - 1 - r : r;
  const cc = f ? N - 1 - c : c;
  return { x: cc * CELL + CELL / 2, y: TOP + rr * CELL + CELL / 2 };
}

// The lobby put this run in a room, or took it out: extras.js then sets turn
// back to 0 and replays that room's moves from the start, so the log starts
// again too. A full room is an online game, built from every move it has had.
function follow() {
  if (turn === 0) {
    nextTurn();
    log = [];
    if (phase === 'online') phase = 'title';
  }
  if (game.ready && phase !== 'online') {
    phase = 'online';
    quiet = true;
    newGame();
    for (const e of log) applyMove(e.m, e.who);
    quiet = false;
  }
}

function draw() {
  follow();
  background('#1b1d2a');
  if (kb.presses('l') && !game.ready) {
    phase = 'local';
    newGame();
    snd.select.play();
  }
  if (kb.presses('r') && winner !== '') {
    if (phase === 'local') newGame();
    if (phase === 'online' && game.ready) online.send({ again: 1 });
  }
  if (mouse.presses() && phase !== 'title' && myMove()) clickAt(mouse.x, mouse.y);
  drawBoard();
  drawPieces();
}

function clickAt(x, y) {
  let c = floor(x / CELL);
  let r = floor((y - TOP) / CELL);
  if (flipped()) { r = N - 1 - r; c = N - 1 - c; }
  if (!onBoard(r, c)) return;
  const p = grid[r][c];
  if (!chain && p !== '' && colorOf(p) === side) {
    picked = { r: r, c: c };
    snd.blip.play();
    return;
  }
  if (picked !== null && isLegal(picked.r, picked.c, r, c)) {
    const m = { fr: picked.r, fc: picked.c, tr: r, tc: c };
    if (phase === 'local') applyMove(m, seatOf(side));
    else online.send(m);        // applied in onMove, on both computers
  }
}

function drawBoard() {
  noStroke();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const s = screenOf(r, c);
    fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
    rect(s.x - CELL / 2, s.y - CELL / 2, CELL, CELL);
  }
  if (lastMove !== null) {
    fill('rgba(80, 170, 255, 0.42)');
    for (const sq of [screenOf(lastMove.fr, lastMove.fc), screenOf(lastMove.tr, lastMove.tc)]) rect(sq.x - CELL / 2, sq.y - CELL / 2, CELL, CELL);
  }
  if (picked !== null && winner === '') {
    const s = screenOf(picked.r, picked.c);
    fill('rgba(255, 215, 0, 0.5)');
    rect(s.x - CELL / 2, s.y - CELL / 2, CELL, CELL);
    if (myMove()) {
      for (const d of [-2, -1, 1, 2]) for (const e of [-1, 1]) {
        const tr = picked.r + d;
        const tc = picked.c + d * e;
        if (onBoard(tr, tc) && isLegal(picked.r, picked.c, tr, tc)) {
          const q = screenOf(tr, tc);
          fill('rgba(255, 215, 0, 0.75)');
          circle(q.x, q.y, 16);
        }
      }
    }
  }
}

function drawPiece(p, x, y) {
  const red = colorOf(p) === 'r';
  fill(red ? '#ffd2c8' : '#9a9a9a');
  circle(x, y + 2, CELL * 0.8);
  fill(red ? '#dc463c' : '#222226');
  circle(x, y, CELL * 0.72);
  fill(red ? '#f06e5f' : '#46464e');
  circle(x, y, CELL * 0.5);
}

function drawPieces() {
  const moving = slides.length > 0 ? slides[0] : null;
  if (moving !== null) moving.t = min(moving.t + 0.16, 1);
  let k = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = grid[r][c];
    if (p === '') continue;
    let s = screenOf(r, c);
    if (moving !== null && moving.tr === r && moving.tc === c) {
      const a = screenOf(moving.fr, moving.fc);
      const t = moving.t;
      s = { x: a.x + (s.x - a.x) * t, y: a.y + (s.y - a.y) * t - sin(t * PI) * 14 };
    }
    drawPiece(p, s.x, s.y);
    if (isKing(p) && k < stars.length) {
      stars[k].x = s.x;
      stars[k].y = s.y;
      stars[k].visible = true;
      k += 1;
    }
  }
  for (; k < stars.length; k++) stars[k].visible = false;
  if (moving !== null && moving.t >= 1) slides.shift();
}

function say(str, x, y, size, color, maxW) {
  str = String(str);
  const s = min(size, maxW / (str.length * 0.6));
  text(str, x + 1, y + 1, s, 'rgba(0,0,0,0.6)');
  text(str, x, y, s, color);
}

function count(t) {
  let n = 0;
  for (const row of grid) for (const p of row) if (p !== '' && colorOf(p) === t) n += 1;
  return n;
}

// What the online side is doing, in words (never a null).
function roomNote() {
  const st = online.status;
  if (st === 'waiting' && phase === 'online') return 'Your classmate left. Wait for them, or press L';
  if (st === 'waiting') return 'Room made: waiting for a classmate (L plays here meanwhile)';
  if (st === 'connecting') return 'Connecting to the room...';
  if (st === 'closed') return 'The room closed. Host a new one, or press L';
  if (st === 'error') return 'Online problem: ' + (online.error || 'try again');
  return '';
}

function statusLine() {
  if (phase === 'local') return 'One computer. L: new game';
  if (online.status === 'ready') return 'Online: you are ' + (online.seat === 0 ? 'Red' : online.seat === 1 ? 'Black' : 'watching');
  return roomNote();
}

function drawTop() {
  say('CHECKERS', 10, 24, 20, 'gold', 140);
  if (phase !== 'title' && winner === '') {
    textAlign('right');
    let who = nameOf(side) + "'s move";
    if (phase === 'online' && game.ready) who = online.seat === seatOf(side) ? 'Your move (' + nameOf(side) + ')' : 'Waiting for ' + nameOf(side);
    say(who, W - 10, 24, 16, side === 'r' ? '#ff8a7a' : '#d0d0d8', 240);
    textAlign('left');
  }
  say(message, 10, 46, 14, 'white', W - 20);
  const st = statusLine();
  if (st.length > 30) say(st, 10, H - 10, 12, 'gold', W - 20);
  else {
    say('Red ' + count('r') + '   Black ' + count('b'), 10, H - 10, 13, '#b9c7d8', 130);
    textAlign('right');
    say(st, W - 10, H - 10, 12, 'gold', W - 150);
    textAlign('left');
  }
  if (phase === 'title') drawTitle();
  else if (winner !== '' && slides.length === 0) drawWinner();
}

const TITLE = [
  ['CHECKERS', 96, 48, 'gold'],
  ['Click a piece, then a gold dot to move it.', 132, 14, 'white'],
  ['Jump over an enemy piece to take it, and jump', 156, 13, '#b9c7d8'],
  ['again if you can. Reach the far row for a king.', 175, 13, '#b9c7d8'],
  ['Leave the other side with no move to win.', 194, 13, '#b9c7d8'],
  ['Two ways to play', 240, 18, 'gold'],
  ['Online: press Host a room above the game,', 268, 14, 'white'],
  ["or Join a classmate's room from Open rooms.", 288, 14, 'white'],
  ['The host plays Red and moves first.', 308, 14, 'white'],
  ['One computer: press L. You play both colours.', 342, 14, 'white'],
];

function drawTitle() {
  fill('rgba(12, 12, 20, 0.88)');
  rect(0, 0, W, H);
  textAlign('center');
  for (const t of TITLE) say(t[0], W / 2, t[1], t[2], t[3], W - 30);
  say(roomNote(), W / 2, 390, 13, 'gold', W - 30);
  textAlign('left');
}

function drawWinner() {
  if (!cheered) { cheered = true; snd.win.play(); }
  fill('rgba(10, 12, 20, 0.84)');
  rect(30, 170, W - 60, 150, 14);
  textAlign('center');
  say(nameOf(winner).toUpperCase() + ' WINS!', W / 2, 222, 38, winner === 'r' ? '#ff8a7a' : '#e0e0e8', W - 80);
  say(message, W / 2, 252, 14, 'white', W - 80);
  let again = 'L: play on this computer';
  if (phase === 'local') again = 'R: play again';
  else if (game.ready) again = 'R: rematch (both screens start again)';
  say(again, W / 2, 292, 15, 'gold', W - 80);
  textAlign('left');
}
```

| Key or click | What it does |
| --- | --- |
| **click** one of your pieces | picks it up; a gold dot marks every square it may move to |
| **click** a gold dot | moves the piece there |
| **L** | starts a game on this computer: whoever has the mouse plays both colours |
| **R** | after a win: plays again (online, a rematch: both screens start again) |
| **Host a room** / **Join** (the bar above the game) | plays a classmate online. The host is Red and moves first |

**Two ways to play.** On one computer, press **L** and take turns with the mouse. Online, one of you presses **Host a room** in the bar above the game; the other finds that room under **Open rooms** and presses **Join**, or clicks its four pictures in order. Black's screen shows the board turned round, so your own pieces are always at the bottom. Rooms are for classmates: you must be signed in and share a class. To try it alone, open this page in a second browser tab: each tab is a different player.

**Try this, in order:**

1. Press **L**. Click a red piece on the bottom rows, then one of its gold dots. The piece slides one square diagonally forward and it is Black's move.
2. Set up a jump: move pieces until a red piece sits diagonally next to a black one with an empty square behind it. Jump it. The black piece is taken, and if the same piece can jump again, it must.
3. Get a piece to the far row. It becomes a **king** (a star) and can move backwards too.
4. Online, try to move a piece that is not yours, or to move on the other player's turn. Nothing happens on either screen: both computers run the same rule check on every move.

## What the game is made of

Every part of it is something you can name, and most of it you build in this chain.

| What you saw | Where you build it |
| --- | --- |
| a board of light and dark squares, filled from a grid of letters | 6.27 (this module) |
| a click turned into a row and a column, picking up a piece, stepping | 6.28 |
| jumping over a piece to take it, and jumping again | 6.29 |
| kings, and winning when the other player has no move | 6.30 |
| the same game on two computers, with the same rule check on both | 6.31 |
| playing it, then showing the legal squares and forced jumps | 6.32 (the playtest and the challenges) |

Some parts are **not** built in this chain, and that is fine:

- **The title screen and the winner panel** are a game that knows which screen it is on (6.11). In the chain the message at the top says who won.
- **The bar above the game** (Host a room, Join, Open rooms) comes from one line, `multiplayer('versus', 2)`, on the moSHion docs' Multiplayer page. In 6.31 you host with H and join with a room code instead. The rule inside is the same: send the move, and check it and apply it in `online.onMove`.
- **The gold dots** are challenge 1 in 6.32.3. **The sliding pieces, the highlighted last move and the board turned round for Black** are only paint: the grid of letters has already changed before the piece slides.
- **The star on a king** is a built-in texture, set with `sprite.texture`, and **the sounds** use `loadSound()`, which you meet in the Pinball unit (5.6).

**Try this next:** look at the table above and think about the game you just played. In 6.27.1 you will be asked to list the parts of checkers. You have just seen more than that.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **grid** | a list of rows, each a list of squares; `grid[r][c]` is the square in row r, column c |
| **step** | a move of one square diagonally forward |
| **jump** | a move of two squares diagonally over an enemy piece, which takes it |
| **king** | a piece that reached the far row; it may move backwards too |
