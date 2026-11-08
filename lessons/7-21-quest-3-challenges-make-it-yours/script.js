// 7.21.3 Challenges: Make it yours.
// Your finished Quest from 7.20.3. Change one thing of your own: a fourth
// enemy kind, a special move with a cooldown, or a shop that spends gold.
// Quest is a turn-based battle. Your hero fights a run of enemies, one at a
// time: on your turn press 1 to attack, 2 to guard (the next hit is halved)
// or 3 to drink a potion. Beat an enemy and you level up before the next one.
// Online: H hosts a duel with a classmate; to join, put the code in JOIN.

const JOIN = '';          // a classmate's room code, e.g. 'BHKE'

const KINDS = [           // the enemies, in order, as data
  { name: 'Slime', hp: 14, power: 3, potions: 0, color: 'limegreen' },
  { name: 'Goblin', hp: 24, power: 5, potions: 1, color: 'orange' },
  { name: 'Ogre', hp: 36, power: 7, potions: 1, color: 'mediumpurple' },
];

class Fighter {
  constructor(name, maxHp, power, potions, color) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.power = power;
    this.color = color;
    this.potions = potions;
    this.guarding = false;
  }

  isAlive() {
    return this.hp > 0;
  }

  // Lose n hp (half, rounded down, while guarding), never below 0.
  // Returns n: the hit after any guard.
  takeHit(n) {
    if (this.guarding) n = floor(n / 2);
    this.guarding = false;
    this.hp = max(this.hp - n, 0);
    return n;
  }

  // Hit another fighter for this fighter's power plus a roll of 0 to 3.
  attack(target, roll) {
    return target.takeHit(this.power + roll);
  }

  guard() {
    this.guarding = true;
  }

  // Drink a potion: up to 12 hp back, never above maxHp. Returns hp gained.
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

  draw(x, y) {
    fill(this.isAlive() ? this.color : '#555');
    circle(x, y, 70);
    if (this.guarding) {
      noFill();
      stroke('gold');
      strokeWeight(4);
      circle(x, y, 86);
      noStroke();
    }
    text(this.name, x - 40, y + 60, 16, 'white');
    fill('#333');
    rect(x - 60, y + 70, 120, 10);
    fill(this.hp > this.maxHp / 3 ? 'limegreen' : 'tomato');
    rect(x - 60, y + 70, 120 * this.hp / this.maxHp, 10);
    text(this.hp + '/' + this.maxHp + '  potions ' + this.potions, x - 60, y + 98, 12, '#ccc');
  }
}

let fighters;             // fighters[0] is you, fighters[1] the one you face
let turn = 0;             // whose turn: 0 or 1
let enemies;              // the run, made from KINDS
let which = 0;            // which enemy you are on
let message = '';
let over = false;         // true when the whole game has ended
let duel = false;         // true in an online duel

function setup() {
  new Canvas(480, 360);
  randomSeed(Date.now());
  newGame();
  online.onMove((m, seat) => {
    if (duel && !over && seat === turn && goodMove(m)) act(turn, m.act, m.roll);
  });
  if (JOIN !== '') {
    duel = true;
    newGame();
    online.join(JOIN);
  }
}

function newGame() {
  if (duel) {
    fighters = [new Fighter('Red', 30, 3, 2, 'tomato'), new Fighter('Blue', 30, 3, 2, 'dodgerblue')];
  } else {
    enemies = KINDS.map((k) => new Fighter(k.name, k.hp, k.power, k.potions, k.color));
    which = 0;
    fighters = [new Fighter('Hero', 30, 3, 2, 'gold'), enemies[0]];
  }
  turn = 0;
  over = false;
  message = duel ? 'Red goes first: 1 attack, 2 guard, 3 potion' : 'Your turn: 1 attack, 2 guard, 3 potion';
}

// A move from the other computer: an action 1-3 and a roll 0-3, whole numbers.
function goodMove(m) {
  return m !== null && typeof m === 'object' &&
    [1, 2, 3].includes(m.act) && [0, 1, 2, 3].includes(m.roll);
}

function myTurn() {
  if (!duel) return turn === 0;
  return online.status === 'ready' && online.seat === turn;
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('h') && !duel && online.status === 'off') {
    duel = true;
    newGame();
    online.host();
  }
  if (!over && myTurn()) {
    let a = 0;
    if (kb.presses('1')) a = 1;
    if (kb.presses('2')) a = 2;
    if (kb.presses('3')) a = 3;
    if (a !== 0) choose(a);
  }
  if (kb.presses('r') && over && !duel) newGame();
  fighters[0].draw(130, 150);
  fighters[1].draw(350, 150);
}

// You picked an action: offline it happens now; online it is sent and
// happens in onMove, on both computers.
function choose(a) {
  const roll = floor(random(0, 4));
  if (duel) online.send({ act: a, roll: roll });
  else act(turn, a, roll);
}

// Fighter t does action a (1 attack, 2 guard, 3 potion) to the other one.
function act(t, a, roll) {
  const me = fighters[t];
  const them = fighters[1 - t];
  if (a === 1) message = me.name + ' hits ' + them.name + ' for ' + me.attack(them, roll);
  if (a === 2) { me.guard(); message = me.name + ' guards'; }
  if (a === 3) message = me.name + ' drinks a potion: +' + me.heal();
  if (!them.isAlive()) {
    fightOver(t);
    return;
  }
  turn = 1 - turn;
  if (!duel && turn === 1) after(45, enemyTurn);
}

// The computer's choice for the enemy: mostly attack, sometimes guard,
// a potion when it is low and has one.
function enemyTurn() {
  if (over || turn !== 1) return;
  const e = fighters[1];
  let a = 1;
  if (e.hp < e.maxHp / 3 && e.potions > 0) a = 3;
  else if (random() < 0.25) a = 2;
  act(1, a, floor(random(0, 4)));
}

function fightOver(winner) {
  if (duel) {
    over = true;
    message = fighters[winner].name + ' wins the duel!';
    return;
  }
  if (winner === 1) {
    over = true;
    message = 'The ' + fighters[1].name + ' beat you. Press R to try again';
    return;
  }
  if (which === enemies.length - 1) {
    over = true;
    message = 'You beat them all! Press R to play again';
    return;
  }
  which += 1;
  fighters[0].levelUp();
  fighters[1] = enemies[which];
  turn = 0;
  message = 'Level up! Next: ' + fighters[1].name + '. Your turn';
}

function drawTop() {
  text(message, 10, 24, 15, 'white');
  if (!duel) text('Fight ' + (which + 1) + ' of ' + enemies.length + '    H: duel a classmate', 10, 46, 12, '#8393c4');
  if (duel && online.status === 'waiting') text('Room code: ' + online.code, 10, 50, 18, 'gold');
  if (duel && online.status === 'connecting') text('Connecting to the room...', 10, 46, 12, 'gold');
  if (duel && online.status === 'ready' && !over && online.seat < 2) text('Online duel: you are ' + fighters[online.seat].name + '. Turn: ' + fighters[turn].name, 10, 46, 12, 'gold');
  if (duel && online.status === 'ready' && !over && online.seat > 1) text('You are watching. Turn: ' + fighters[turn].name, 10, 46, 12, 'gold');
  if (duel && online.status === 'ready' && over) text('Play again: Stop, Run. One hosts (H), one joins the new code', 10, 46, 12, 'gold');
  if (duel && online.status === 'closed') text('Room closed: one hosts (H), one joins the new code', 10, 46, 12, 'gold');
  if (duel && online.status === 'error') text(('' + online.error).slice(0, 60), 10, 46, 12, 'tomato');
}
