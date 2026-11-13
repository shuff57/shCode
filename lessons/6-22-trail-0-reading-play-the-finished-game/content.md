## Play the finished game

**Read before `6.22.1 Plan: Break Trail into parts`.** About 5 minutes. There is nothing to write here: you play.

By the end of this you should be able to answer:

- What does a finished Trail have that a row of squares does not?
- Which of those parts do you build in the next five modules (6.22 to 6.26)?

Trail looks like one idea and is really four: a path of squares made from one line of text, a die and whose turn it is, squares that do something when you land on them, and the same game played by two computers. The next five modules build them one at a time. Before you start, play the game you are building towards. The code is hidden on purpose: you are not expected to read it yet.

**Try it:** press **Play**. The title screen says the two ways to play, and the keys are in the table below the game.

```js live demo size=580x400 id=trail-finished-game
// TRAIL: the finished demo students play before they build their own (6.22-6.26).
//
// The core is exactly the chain's game: a path of squares made from one line of
// text, rows that snake back and forth, two tokens, a die, whose turn it is,
// squares that jump, slide and wait, and a winner. Online goes through
// multiplayer('versus', 2): the lobby bar above the game hosts and joins, every
// roll is sent, and onMove applies it on both computers after checking the seat
// and the roll. On one computer, L starts a game where whoever is at the keys
// rolls for both. On top: a title screen, a winner panel, a tumbling die,
// hopping tokens, textures and sound.
//
// Controls:  SPACE or click = roll   L = play on this computer   R = rematch

const TRACK = '....J....S..W..J.....S..W.J.S.F';   // one letter per square
const COLS = 10;
const SIZE = 56;
const TOP = 64;                  // the words live in the strip above the board
const W = COLS * SIZE;           // 560
const H = 380;
const NAMES = ['Pink', 'Blue'];
const INK = ['#ff7fb8', '#5ab4ff'];
const SKINS = ['playerPink', 'playerBlue'];
const TILE = { '.': 'sand', J: 'grass', S: 'ice', W: 'water', F: 'grass' };
const LABEL = { J: '+3', S: '-3', W: 'wait' };

let path;                        // path[i] is { x, y, kind }
let racers;                      // racers[p] is { at, waiting }
let side = 0;                    // whose turn: 0 Pink, 1 Blue
let lastRoll = 0;
let message = '';
let winner = -1;

let phase = 'title';             // 'title' | 'local' | 'online'
let log = [];                    // every move this room has sent, in order
let quiet = false;               // true while the log replays: no sound, no animation
let tokens = [];
let die;
let rolling = 0;                 // frames left on the die's tumble
let hops = [[], []];             // squares each token still hops through (display only)
let shown = [0, 0];              // the square each token is drawn on
let hopWait = 0;
let cheered = false;
let confetti = [];
let snd = {};

function setup() {
  new Canvas(W, H);
  randomSeed(Date.now());
  multiplayer('versus', 2);
  nextTurn();                    // turn is 1 until the lobby puts us in a room (see follow)
  online.onMove((m, who) => {
    follow();
    log.push({ m: m, who: who });
    if (phase === 'online') applyMove(m, who);
  });
  for (const name of ['dice', 'step', 'jump', 'whoosh', 'blip', 'win', 'select']) {
    snd[name] = loadSound(name);
  }
  path = makePath(TRACK);
  for (let i = 0; i < path.length; i++) {
    const s = new Sprite(path[i].x, path[i].y, SIZE - 6, SIZE - 6);
    s.collider = 'none';
    s.texture = TILE[path[i].kind];
    s.layer = 1;
    if (path[i].kind === 'J' || path[i].kind === 'F') {
      const t = new Sprite(path[i].x, path[i].y - 2, 34, 34);
      t.collider = 'none';
      t.texture = path[i].kind === 'J' ? 'spring' : 'flag';
      t.layer = 2;
    }
  }
  for (let p = 0; p < 2; p++) {
    const t = new Sprite(path[0].x, path[0].y, 34, 46);
    t.collider = 'none';
    t.texture = SKINS[p];
    t.layer = 5;
    tokens.push(t);
  }
  die = new Sprite(54, 334, 56, 56);
  die.collider = 'none';
  die.texture = 'num1';
  die.layer = 5;
  newGame();
}

// The track is text; the path is data made from it. Odd rows run right to left.
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

function newGame() {
  racers = [{ at: 0, waiting: false }, { at: 0, waiting: false }];
  side = 0;
  winner = -1;
  lastRoll = 0;
  message = 'Pink goes first';
  hops = [[], []];
  shown = [0, 0];
  rolling = 0;
  cheered = false;
  confetti = [];
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

function goodRoll(r) {
  return typeof r === 'number' && floor(r) === r && r >= 1 && r <= 6;
}

// The one place a move changes the game. Both computers run it for every move,
// so both ignore the same bad ones: the wrong seat, a roll that is no die.
function applyMove(m, who) {
  if (m === null || typeof m !== 'object') return;
  if (m.again === 1 && winner !== -1) { newGame(); return; }
  if (who !== side || winner !== -1 || !goodRoll(m.roll)) return;
  takeTurn(m.roll);
}

function takeTurn(r) {
  const p = racers[side];
  const from = p.at;
  const last = path.length - 1;
  lastRoll = r;
  p.at = min(p.at + r, last);
  const steps = [];
  for (let i = from + 1; i <= p.at; i++) steps.push({ at: i, how: 'step' });
  const kind = path[p.at].kind;
  message = NAMES[side] + ' rolled ' + r;
  if (kind === 'J') {
    const to = min(p.at + 3, last);
    steps.push({ at: to, how: 'jump' });
    p.at = to;
    message += ', sprang ahead 3';
  }
  if (kind === 'S') {
    const to = max(p.at - 3, 0);
    steps.push({ at: to, how: 'slide' });
    p.at = to;
    message += ', slid back 3';
  }
  if (kind === 'W') { p.waiting = true; message += ', stuck: waits a turn'; }
  if (!quiet) {
    rolling = 22;
    snd.dice.play();
    hops[side] = hops[side].concat(steps);
  } else {
    shown[side] = p.at;
  }
  if (p.at === last) {
    winner = side;
    message = NAMES[side] + ' reached the flag!';
    return;
  }
  passTurn();
}

function passTurn() {
  side = 1 - side;
  if (racers[side].waiting) {
    racers[side].waiting = false;
    message += '. ' + NAMES[side] + ' waits';
    side = 1 - side;
  }
}

function busy() {
  return rolling > 0 || hops[0].length > 0 || hops[1].length > 0;
}

function canRoll() {
  if (winner !== -1 || busy()) return false;
  if (phase === 'local') return true;
  return phase === 'online' && game.ready && online.seat === side;
}

function roll() {
  const r = floor(random(1, 7));
  if (phase === 'local') applyMove({ roll: r }, side);
  else online.send({ roll: r });       // applied in onMove, on both computers
}

function draw() {
  follow();
  background('#16241c');
  if (kb.presses('l') && !game.ready) {
    phase = 'local';
    newGame();
    snd.select.play();
  }
  const click = mouse.presses() && mouse.y > TOP && phase !== 'title';
  if ((kb.presses('space') || click) && canRoll()) roll();
  if (kb.presses('r') && winner !== -1 && !busy()) {
    if (phase === 'local') newGame();
    if (phase === 'online' && game.ready) online.send({ again: 1 });
  }
  animate();
  // the trail between the squares, so the snake reads as one path
  stroke('#6b4f2a');
  strokeWeight(10);
  for (let i = 1; i < path.length; i++) line(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y);
  noStroke();
  fill('#0f1913');
  rect(0, TOP + 4 * SIZE, W, H - TOP - 4 * SIZE);
}

// Display only: the die tumbles, then each token hops one square at a time.
function animate() {
  if (rolling > 0) {
    rolling -= 1;
    die.texture = rolling > 0 ? 'num' + (1 + (floor(frameCount / 3) % 6)) : 'num' + lastRoll;
    die.rotation = rolling > 0 ? rolling * 9 : 0;
  } else {
    for (let p = 0; p < 2; p++) {
      if (hops[p].length === 0) continue;
      if (hopWait > 0) { hopWait -= 1; break; }
      const h = hops[p].shift();
      shown[p] = h.at;
      hopWait = h.how === 'step' ? 9 : 22;
      if (h.how === 'step') snd.step.play();
      if (h.how === 'jump') snd.jump.play();
      if (h.how === 'slide') snd.whoosh.play();
      if (hops[p].length === 0 && racers[p].waiting) snd.blip.play();
      break;
    }
  }
  if (lastRoll === 0) die.texture = 'num1';
  for (let p = 0; p < 2; p++) {
    const s = path[shown[p]];
    const same = shown[0] === shown[1];
    const tx = s.x + (same ? (p === 0 ? -11 : 11) : 0);
    const t = tokens[p];
    t.x += (tx - t.x) * 0.35;
    t.y += (s.y - 4 - t.y) * 0.35;
    t.scale = p === side && winner === -1 && phase !== 'title' ? 1 + 0.06 * sin(frameCount * 0.15) : 1;
  }
  if (winner !== -1 && !busy() && !cheered) {
    cheered = true;
    snd.win.play();
    for (let i = 0; i < 60; i++) {
      confetti.push({ x: random(0, W), y: random(-120, 0), v: random(1.5, 3.5), c: random([INK[0], INK[1], 'gold', 'white']) });
    }
  }
}

// text that never runs off the canvas: shrink it until it fits in maxW
function say(str, x, y, size, color, maxW) {
  str = String(str);
  const s = min(size, maxW / (str.length * 0.6));
  text(str, x + 1, y + 1, s, 'rgba(0,0,0,0.6)');
  text(str, x, y, s, color);
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
  if (phase === 'local') return 'One computer: you roll for both players. L: new game';
  if (online.status === 'ready') return 'Online: you are ' + (online.seat === 0 || online.seat === 1 ? NAMES[online.seat] : 'watching');
  return roomNote();
}

function drawTop() {
  textAlign('center');
  for (let i = 0; i < path.length; i++) {
    const k = path[i].kind;
    if (LABEL[k]) say(LABEL[k], path[i].x, path[i].y + 24, 12, 'white', SIZE - 8);
  }
  textAlign('left');
  for (let i = 0; i < path.length; i++) text('' + (i + 1), path[i].x - 25, path[i].y - 16, 10, 'rgba(0,0,0,0.55)');

  say('TRAIL', 14, 30, 24, 'gold', 120);
  say(message, 14, 54, 15, 'white', W - 28);
  if (phase !== 'title' && winner === -1) {
    textAlign('right');
    say(NAMES[side] + "'s turn", W - 14, 30, 18, INK[side], 260);
    textAlign('left');
  }

  // the strip under the board
  let prompt = '';
  if (winner !== -1) prompt = NAMES[winner] + ' wins!';
  else if (phase === 'local') prompt = NAMES[side] + ': press SPACE or click to roll';
  else if (phase === 'online' && game.ready && online.seat === side) prompt = 'Your turn: press SPACE or click to roll';
  else if (phase === 'online') prompt = 'Waiting for ' + NAMES[side] + ' to roll';
  say(prompt, 100, 322, 18, winner !== -1 ? INK[winner] : 'white', W - 112);
  say('+3 spring jumps ahead   -3 ice slides back   pond: wait a turn', 100, 346, 12, '#b9c7d8', W - 112);
  say(statusLine(), 100, 368, 12, 'gold', W - 112);

  if (phase === 'title') drawTitle();
  else if (winner !== -1 && !busy()) drawWinner();
}

const TITLE = [
  ['TRAIL', 88, 56, 'gold'],
  ['Roll the die, hop along the path, first to the flag wins.', 124, 15, 'white'],
  ['Springs jump you ahead, ice slides you back, a pond makes you wait.', 148, 13, '#b9c7d8'],
  ['Two ways to play', 196, 18, 'gold'],
  ['Online: press Host a room above the game, or Join', 226, 15, 'white'],
  ["a classmate's room from Open rooms. Host is Pink.", 248, 15, 'white'],
  ['One computer: press L. You roll for both players.', 282, 15, 'white'],
];

function drawTitle() {
  fill('rgba(8, 14, 10, 0.86)');
  rect(0, 0, W, H);
  textAlign('center');
  for (const t of TITLE) say(t[0], W / 2, t[1], t[2], t[3], W - 40);
  say(roomNote(), W / 2, 330, 14, 'gold', W - 40);
  textAlign('left');
}

function drawWinner() {
  for (const c of confetti) {
    c.y += c.v;
    if (c.y > H) c.y = -10;
    fill(c.c);
    rect(c.x + 6 * sin(c.y * 0.05), c.y, 6, 9);
  }
  fill('rgba(10, 12, 20, 0.82)');
  rect(W / 2 - 190, 110, 380, 150, 14);
  textAlign('center');
  say(NAMES[winner].toUpperCase() + ' WINS!', W / 2, 162, 40, INK[winner], 360);
  say('First to the flag, with a roll of ' + lastRoll + ' to finish', W / 2, 192, 14, 'white', 360);
  let again = 'L: play on this computer';
  if (phase === 'local') again = 'R: play again   L: new game';
  else if (game.ready) again = 'R: rematch (both screens start again)';
  say(again, W / 2, 230, 15, 'gold', 360);
  textAlign('left');
}
```

| Key | What it does |
| --- | --- |
| **SPACE**, or a **click** on the board | rolls the die on your turn |
| **L** | starts a game on this computer: whoever is at the keys rolls for both players |
| **R** | after a win: plays again (online, a rematch: both screens start again) |
| **Host a room** / **Join** (the bar above the game) | plays a classmate online. The host is Pink and rolls first |

**Two ways to play.** On one computer, press **L** and take turns at the keyboard. Online, one of you presses **Host a room** in the bar above the game; the other finds that room under **Open rooms** and presses **Join**, or clicks its four pictures in order. Rooms are for classmates: you must be signed in and share a class. To try it alone, open this page in a second browser tab: each tab is a different player.

**Try this, in order:**

1. Press **L**, then SPACE. The die tumbles, then the token hops one square at a time and the turn passes to the other colour.
2. Watch the squares. A **spring** (`+3`) sends you 3 squares ahead, **ice** (`-3`) slides you 3 back, and a **pond** (`wait`) makes you miss your next turn.
3. Keep rolling until a token reaches the **flag**. The winner panel says who won; press R to play again.
4. Online, try to roll when it is not your turn. Nothing happens on either screen: only the player whose turn it is can move, and both computers check that.

## What the game is made of

Every part of it is something you can name, and most of it you build in this chain.

| What you saw | Where you build it |
| --- | --- |
| a path of squares from one line of text, with rows that snake back and forth | 6.22 (this module) |
| a die, a token for each player, and whose turn it is | 6.23 |
| squares that jump you ahead, slide you back or make you wait | 6.24 |
| the same game on two computers: send the roll, apply it on both | 6.25 |
| playing it, then three players and a token that hops | 6.26 (the playtest and the challenges) |

Some parts are **not** built in this chain, and that is fine:

- **The title screen and the winner panel** are a game that knows which screen it is on (6.11). In the chain the message at the top says who won.
- **The bar above the game** (Host a room, Join, Open rooms) comes from one line, `multiplayer('versus', 2)`, on the moSHion docs' Multiplayer page. In 6.25 you host with H and join with a room code instead. The rule inside is the same: send the roll, and apply it in `online.onMove`.
- **The tumbling die and the hopping tokens** are only paint: the token has already landed before the hop starts. A token that hops is challenge 2 in 6.26.3.
- **The pictures** (sand, grass, ice, the players, the die faces) are built-in textures, set with `sprite.texture`, and **the sounds** use `loadSound()`, which you meet in the Pinball unit (5.6).

**Try this next:** look at the table above and think about the game you just played. In 6.22.1 you will be asked to list the parts of Trail. You have just seen more than that.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **square** | one place on the path; the path is a list of them, in order |
| **token** | a player's piece; it remembers which square it is on |
| **turn** | whose go it is: 0 for the first player, 1 for the second |
| **room** | where two computers meet to play one game; the host makes it, a classmate joins it |
