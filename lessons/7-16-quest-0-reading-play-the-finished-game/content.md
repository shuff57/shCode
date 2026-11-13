## Play the finished game

**Read before `7.16.1 Plan: Break Quest into parts`.** About 5 minutes. There is nothing to write here: you play.

By the end of this you should be able to answer:

- What does a finished Quest have that two fighters standing still do not?
- Which of those parts do you build in the next six modules (7.16 to 7.21)?

Quest looks like one idea and is really five: one class that makes every fighter, a method that hits another object, three actions to choose from, a run of enemies made from a list of kinds, and a duel with a classmate on another computer. The next six modules build them one at a time. Before you start, play the game you are building towards. The code is hidden on purpose: you are not expected to read it yet.

**Try it:** press **Play**. The title screen says the ways to play, and the keys are in the table below the game.

```js live demo size=500x420 id=quest-finished-game
// QUEST: the finished demo students play before they build their own (7.16-7.21).
//
// The core is exactly the chain's game: one Fighter class makes every fighter
// (hp, power, potions, a guard flag), attack() hits another object, three
// actions, a run of enemies made from a list of kinds with a level-up between
// fights, and a duel with a classmate. Online goes through
// multiplayer('versus', 2): the lobby bar above the game hosts and joins, every
// action is sent with its roll, and onMove applies it on both computers after
// checking the seat and the action. On one computer: SPACE fights the run
// alone, L is a duel where whoever is at the keys plays both heroes. On top: a
// title screen, a winner panel, textures, hit flashes, numbers that float up,
// clickable action buttons and sound.
//
// Controls:  1 attack  2 guard  3 potion (or click the buttons)
//            SPACE = quest alone   L = duel on this computer   R = play again

const W = 480;
const H = 400;
const SPOT = [130, 350];          // where the two fighters stand

const KINDS = [                   // the run of enemies, in order, as data
  { name: 'Slime', hp: 14, power: 3, potions: 0, skin: 'slime' },
  { name: 'Bat', hp: 22, power: 5, potions: 1, skin: 'bat' },
  { name: 'Monster', hp: 34, power: 7, potions: 1, skin: 'monster' },
];

class Fighter {
  constructor(name, maxHp, power, potions, skin) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.power = power;
    this.potions = potions;
    this.skin = skin;
    this.guarding = false;
  }

  isAlive() {
    return this.hp > 0;
  }

  // Lose n hp (half, rounded down, while guarding). Returns the hit after the guard.
  takeHit(n) {
    if (this.guarding) n = floor(n / 2);
    this.guarding = false;
    this.hp = max(this.hp - n, 0);
    return n;
  }

  attack(target, roll) {
    return target.takeHit(this.power + roll);
  }

  guard() {
    this.guarding = true;
  }

  heal() {
    if (this.potions === 0) return 0;
    this.potions -= 1;
    const before = this.hp;
    this.hp = min(this.hp + 12, this.maxHp);
    return this.hp - before;
  }

  levelUp() {
    this.maxHp += 5;
    this.hp = this.maxHp;
    this.power += 1;
    this.potions = 2;
  }
}

let fighters;                     // fighters[0] on the left, fighters[1] on the right
let side = 0;                     // whose turn: 0 or 1
let enemies;
let which = 0;                    // which enemy of the run
let message = '';
let over = false;
let winner = -1;

let phase = 'title';              // 'title' | 'solo' | 'local' | 'online'
let log = [];                     // every move this room has sent, in order
let quiet = false;                // true while the log replays: no sound, no effects
let gameId = 0;
let bodies = [];                  // the two fighters' sprites
let shields = [];
let burst;
let burstLeft = 0;                // frames the hit flash still shows
let floaters = [];                // numbers that float up (display only)
let shake = [0, 0];
let lunge = [0, 0];
let cheered = false;
let snd = {};

const BUTTONS = [
  { key: '1', word: 'Attack', icon: 'swordGold', x: 20 },
  { key: '2', word: 'Guard', icon: 'shield', x: 175 },
  { key: '3', word: 'Potion', icon: 'heart', x: 330 },
];

function setup() {
  new Canvas(W, H);
  randomSeed(Date.now());
  multiplayer('versus', 2);
  nextTurn();                     // turn is 1 until the lobby puts us in a room (see follow)
  online.onMove((m, who) => {
    follow();
    log.push({ m: m, who: who });
    if (phase === 'online') applyMove(m, who);
  });
  for (const name of ['sword', 'clang', 'potion', 'levelup', 'win', 'lose', 'select', 'hit']) {
    snd[name] = loadSound(name);
  }
  for (let i = 0; i < 2; i++) {
    const b = new Sprite(SPOT[i], 170, 72, 72);
    b.collider = 'none';
    b.layer = 3;
    bodies.push(b);
    const s = new Sprite(SPOT[i] + (i === 0 ? 34 : -34), 180, 40, 40);
    s.collider = 'none';
    s.texture = 'shield';
    s.layer = 4;
    s.visible = false;
    shields.push(s);
  }
  burst = new Sprite(-100, -100, 64, 64);
  burst.collider = 'none';
  burst.texture = 'burst';
  burst.layer = 5;
  for (const b of BUTTONS) {
    const s = new Sprite(b.x + 26, 342, 30, 30);
    s.collider = 'none';
    s.texture = b.icon;
    s.layer = 4;
  }
  newGame();
}

function newGame() {
  gameId += 1;
  if (phase === 'solo' || phase === 'title') {
    enemies = KINDS.map((k) => new Fighter(k.name, k.hp, k.power, k.potions, k.skin));
    which = 0;
    fighters = [new Fighter('Hero', 30, 3, 2, 'player'), enemies[0]];
    message = 'A Slime blocks the road. Your move';
  } else {
    fighters = [new Fighter('Pink', 30, 3, 2, 'playerPink'), new Fighter('Blue', 30, 3, 2, 'playerBlue')];
    message = 'Pink moves first';
  }
  side = 0;
  over = false;
  winner = -1;
  floaters = [];
  cheered = false;
}

// The lobby put this run in a room, or took it out: extras.js then sets turn
// back to 0 and replays that room's moves from the start, so the log starts
// again too. A full room is an online duel, built from every move it has had.
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

// A move: an action 1-3 and a roll 0-3, whole numbers. Anything else is ignored.
function goodMove(m) {
  return m !== null && typeof m === 'object' && [1, 2, 3].includes(m.act) && [0, 1, 2, 3].includes(m.roll);
}

// The one place an online move changes the game, run by both computers.
function applyMove(m, who) {
  if (m === null || typeof m !== 'object') return;
  if (m.again === 1 && over) { newGame(); return; }
  if (!over && who === side && goodMove(m)) act(side, m.act, m.roll);
}

function canAct() {
  if (over) return false;
  if (phase === 'solo') return side === 0;
  if (phase === 'local') return true;
  return phase === 'online' && game.ready && online.seat === side;
}

function choose(a) {
  const roll = floor(random(0, 4));
  if (phase === 'online') online.send({ act: a, roll: roll });   // applied in onMove
  else act(side, a, roll);
}

function act(t, a, roll) {
  const me = fighters[t];
  const them = fighters[1 - t];
  if (a === 1) {
    const n = me.attack(them, roll);
    message = me.name + ' hits ' + them.name + ' for ' + n;
    effect(1 - t, '-' + n, 'tomato', n < me.power ? 'clang' : 'sword');
    if (!quiet) lunge[t] = 16;
  }
  if (a === 2) {
    me.guard();
    message = me.name + ' raises a shield';
    effect(t, 'guard', 'gold', 'clang');
  }
  if (a === 3) {
    const n = me.heal();
    message = n > 0 ? me.name + ' drinks a potion: +' + n : me.name + ' has no potion left!';
    effect(t, n > 0 ? '+' + n : 'empty', 'lightgreen', 'potion');
  }
  if (!them.isAlive()) {
    fightOver(t);
    return;
  }
  side = 1 - side;
  if (phase === 'solo' && side === 1) {
    const id = gameId;
    after(50, () => { if (id === gameId) enemyTurn(); });
  }
}

function effect(t, words, color, sound) {
  if (quiet) return;
  floaters.push({ x: SPOT[t], y: 110, words: words, color: color, life: 50 });
  if (words[0] === '-') {
    burst.x = SPOT[t];
    burst.y = 165;
    burstLeft = 14;
    shake[t] = 12;
  }
  snd[sound].play();
}

// The computer's choice for the enemy: mostly attack, sometimes guard,
// a potion when it is low and has one.
function enemyTurn() {
  if (over || side !== 1 || phase !== 'solo') return;
  const e = fighters[1];
  let a = 1;
  if (e.hp < e.maxHp / 3 && e.potions > 0) a = 3;
  else if (random() < 0.25) a = 2;
  act(1, a, floor(random(0, 4)));
}

function fightOver(t) {
  if (phase !== 'solo') {
    over = true;
    winner = t;
    message = fighters[t].name + ' wins the duel!';
    return;
  }
  if (t === 1) {
    over = true;
    winner = 1;
    message = 'The ' + fighters[1].name + ' beat you';
    return;
  }
  if (which === enemies.length - 1) {
    over = true;
    winner = 0;
    message = 'You beat every monster on the road!';
    return;
  }
  which += 1;
  fighters[0].levelUp();
  fighters[1] = enemies[which];
  side = 0;
  message = 'Level up! A ' + fighters[1].name + ' appears. Your move';
  if (!quiet) {
    snd.levelup.play();
    floaters.push({ x: SPOT[0], y: 110, words: 'LEVEL UP', color: 'gold', life: 70 });
  }
}

function draw() {
  follow();
  background('#1d1830');
  if (!game.ready && kb.presses('l')) {
    phase = 'local';
    newGame();
    snd.select.play();
  }
  if (!game.ready && kb.presses('space') && (phase === 'title' || over)) {
    phase = 'solo';
    newGame();
    snd.select.play();
  }
  if (kb.presses('r') && over) {
    if (phase === 'online' && game.ready) online.send({ again: 1 });
    else if (phase !== 'online') newGame();
  }
  if (phase !== 'title' && canAct()) {
    let a = 0;
    for (let i = 0; i < 3; i++) {
      if (kb.presses(BUTTONS[i].key)) a = i + 1;
      if (mouse.presses() && overButton(i)) a = i + 1;
    }
    if (a !== 0) choose(a);
  }
  // the arena: a far hill, the ground, a shadow under each fighter
  fill('#2a2346');
  ellipse(W / 2, 250, 700, 200);
  fill('#3a2f24');
  rect(0, 220, W, 100);
  fill('rgba(0,0,0,0.35)');
  for (let i = 0; i < 2; i++) ellipse(SPOT[i], 212, 80, 16);
  // the bodies follow the fighters
  for (let i = 0; i < 2; i++) {
    const f = fighters[i];
    const b = bodies[i];
    b.texture = f.skin;   // the same texture again changes nothing
    lunge[i] = max(lunge[i] - 1, 0);
    shake[i] = max(shake[i] - 1, 0);
    const toward = i === 0 ? 1 : -1;
    b.x = SPOT[i] + toward * sin(lunge[i] / 16 * PI) * 40 + (shake[i] > 0 ? random(-4, 4) : 0);
    b.y = 170 + (f.isAlive() ? sin(frameCount * 0.08 + i * 2) * 3 : 18);
    b.rotation = f.isAlive() ? 0 : (i === 0 ? -90 : 90);
    b.scale.x = i === 0 ? 1 : -1;
    b.opacity = f.isAlive() ? 1 : 0.5;
    shields[i].visible = f.guarding && phase !== 'title';
  }
  burstLeft = max(burstLeft - 1, 0);
  burst.visible = burstLeft > 0;
  burst.scale = 0.6 + burstLeft / 20;
  // the action buttons
  for (let i = 0; i < 3; i++) {
    const on = phase !== 'title' && canAct();
    fill(on && overButton(i) ? '#4b3f7a' : on ? '#352c5c' : '#26213d');
    rect(BUTTONS[i].x, 322, 130, 42, 8);
  }
}

function overButton(i) {
  const b = BUTTONS[i];
  return mouse.x > b.x && mouse.x < b.x + 130 && mouse.y > 322 && mouse.y < 364;
}

function say(str, x, y, size, color, maxW) {
  str = String(str);
  const s = min(size, maxW / (str.length * 0.6));
  text(str, x + 1, y + 1, s, 'rgba(0,0,0,0.6)');
  text(str, x, y, s, color);
}

function drawCard(f, x) {
  textAlign('center');
  say(f.name, x, 236, 16, 'white', 150);
  fill('#111');
  rect(x - 62, 246, 124, 12, 4);
  fill(f.hp > f.maxHp / 3 ? '#4cd964' : 'tomato');
  rect(x - 62, 246, 124 * f.hp / f.maxHp, 12, 4);
  say(f.hp + ' / ' + f.maxHp + ' hp   power ' + f.power, x, 276, 12, '#d8d0f0', 170);
  say('potions ' + f.potions + (f.guarding ? '   guarding' : ''), x, 294, 12, f.guarding ? 'gold' : '#d8d0f0', 170);
  textAlign('left');
}

function roomNote() {
  const st = online.status;
  if (st === 'waiting' && phase === 'online') return 'Your classmate left. Wait for them, or press L';
  if (st === 'waiting') return 'Room made: waiting for a classmate. L or SPACE plays here meanwhile';
  if (st === 'connecting') return 'Connecting to the room...';
  if (st === 'closed') return 'The room closed. Host a new one, or press L';
  if (st === 'error') return 'Online problem: ' + (online.error || 'try again');
  return '';
}

function turnLine() {
  if (over) return '';
  if (phase === 'solo') return side === 0 ? 'Your move: 1, 2 or 3' : 'The ' + fighters[1].name + ' is thinking...';
  if (phase === 'local') return fighters[side].name + "'s move: 1, 2 or 3";
  if (!game.ready) return roomNote();
  if (online.seat === side) return 'Your move (' + fighters[side].name + '): 1, 2 or 3';
  return 'Waiting for ' + fighters[side].name + ' to choose';
}

function drawTop() {
  say('QUEST', 12, 28, 22, 'gold', 100);
  textAlign('right');
  let where = '';
  if (phase === 'solo') where = 'Fight ' + (which + 1) + ' of ' + KINDS.length;
  if (phase === 'local') where = 'Duel on one computer';
  if (phase === 'online') where = online.seat === 0 || online.seat === 1 ? 'Online duel: you are ' + fighters[online.seat].name : 'Online duel';
  say(where, W - 12, 28, 14, '#b9a8ff', 330);
  textAlign('left');
  say(message, 12, 54, 15, 'white', W - 24);
  for (let i = 0; i < 2; i++) drawCard(fighters[i], SPOT[i]);
  for (const b of BUTTONS) say(b.key + ' ' + b.word, b.x + 50, 349, 16, 'white', 78);
  textAlign('center');
  say(turnLine(), W / 2, 390, 14, 'gold', W - 24);
  for (const f of floaters) {
    say(f.words, f.x, f.y, 22, f.color, 140);
    f.y -= 0.7;
    f.life -= 1;
  }
  floaters = floaters.filter((f) => f.life > 0);
  textAlign('left');
  if (phase === 'title') drawTitle();
  else if (over) drawWinner();
}

const TITLE = [
  ['QUEST', 92, 56, 'gold'],
  ['A turn-based battle. Each turn, pick one action:', 132, 15, 'white'],
  ['1 attack   2 guard (halves the next hit)   3 potion', 156, 14, '#d8d0f0'],
  ['SPACE: quest alone against a run of monsters', 202, 16, 'white'],
  ['Duel a classmate online: press Host a room above', 238, 14, 'white'],
  ["the game, or Join a room from Open rooms.", 258, 14, 'white'],
  ['L: duel a friend on this computer (you take turns)', 292, 14, 'white'],
];

function drawTitle() {
  fill('rgba(14, 10, 26, 0.86)');
  rect(0, 0, W, H);
  textAlign('center');
  for (const t of TITLE) say(t[0], W / 2, t[1], t[2], t[3], W - 30);
  say(roomNote(), W / 2, 336, 13, 'gold', W - 30);
  textAlign('left');
}

function drawWinner() {
  const good = phase !== 'solo' || winner === 0;
  if (!cheered && floaters.length === 0) {
    cheered = true;
    if (good) snd.win.play();
    else snd.lose.play();
  }
  if (!cheered) return;
  fill('rgba(12, 8, 24, 0.86)');
  rect(50, 92, W - 100, 160, 14);
  textAlign('center');
  let big = fighters[winner].name.toUpperCase() + ' WINS!';
  if (phase === 'solo') big = winner === 0 ? 'VICTORY!' : 'DEFEATED';
  say(big, W / 2, 148, 40, good ? 'gold' : 'tomato', W - 130);
  say(message, W / 2, 180, 14, 'white', W - 130);
  let again = 'SPACE: quest alone   L: duel here';
  if (phase === 'solo') again = 'R or SPACE: play again   L: duel here';
  if (phase === 'local') again = 'R: duel again   SPACE: quest alone';
  if (phase === 'online' && game.ready) again = 'R: rematch (both screens start again)';
  say(again, W / 2, 222, 14, 'gold', W - 130);
  textAlign('left');
}
```

| Key or click | What it does |
| --- | --- |
| **1**, or the **Attack** button | hits the other fighter for their power plus a roll of 0 to 3 |
| **2**, or the **Guard** button | raises a shield: the next hit you take is halved |
| **3**, or the **Potion** button | drinks a potion: up to 12 hp back, while you have potions |
| **SPACE** | starts a quest alone against a run of three monsters |
| **L** | starts a duel on this computer: whoever is at the keys plays both heroes |
| **R** | after the end: plays again (online, a rematch: both screens start again) |
| **Host a room** / **Join** (the bar above the game) | duels a classmate online. The host is Pink and moves first |

**Three ways to play.** Alone, press **SPACE** and fight the Slime, the Bat and the Monster in turn. On one computer with a friend, press **L** and take turns at the keyboard. Online, one of you presses **Host a room** in the bar above the game; the other finds that room under **Open rooms** and presses **Join**, or clicks its four pictures in order. Rooms are for classmates: you must be signed in and share a class. To try it alone, open this page in a second browser tab: each tab is a different player.

**Try this, in order:**

1. Press **SPACE** and attack the Slime with **1** until it falls. Your hero levels up (more hp, more power, two potions) and a Bat appears.
2. Against the Bat, press **2** before it attacks. Its hit comes in at half and the shield goes away.
3. Run low on hp, then press **3**. You get hp back, and the potion count goes down by one. With none left, a potion does nothing and costs your turn.
4. Online, press 1 when it is the other player's turn. Nothing happens on either screen: only the player whose turn it is can act, and both computers check that.

## What the game is made of

Every part of it is something you can name, and most of it you build in this chain.

| What you saw | Where you build it |
| --- | --- |
| two fighters, each with a name, hp and an hp bar, all made by one class | 7.16 (this module) |
| one fighter hitting another, and taking turns until one falls | 7.17 |
| three actions: attack, guard (a flag) and potion (a count) | 7.18 |
| a run of enemies made from a list of kinds, and levelling up between fights | 7.19 |
| a duel with a classmate on another computer | 7.20 |
| playing it, then a fourth enemy, a special move and a shop | 7.21 (the playtest and the challenges) |

Some parts are **not** built in this chain, and that is fine:

- **The title screen and the winner panel** are a game that knows which screen it is on (6.11). In the chain the message at the top says what happened.
- **The bar above the game** (Host a room, Join, Open rooms) comes from one line, `multiplayer('versus', 2)`, on the moSHion docs' Multiplayer page. In 7.20 you host with H and join with a room code instead. The rule inside is the same: send the action and its roll, and apply it in `online.onMove`.
- **The buttons, the hit flash, the numbers that float up and the fighters that lunge** are only paint: the hp has already changed before the number floats.
- **The pictures** (the heroes, the monsters, the sword, the shield, the burst) are built-in textures, set with `sprite.texture`, and **the sounds** use `loadSound()`, which you meet in the Pinball unit (5.6).

**Try this next:** look at the table above and think about the game you just played. In 7.16.1 you will be asked to list the parts of Quest. You have just seen more than that.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **hp** | hit points: how much a fighter can take before it falls |
| **power** | how hard a fighter hits, before the roll is added |
| **guard** | a flag that halves the next hit, then turns itself off |
| **level up** | after a win: more hp, more power and new potions for the next fight |
