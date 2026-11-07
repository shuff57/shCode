// 7.20.3 Lab: Duel a classmate.
// Quest: a turn-based battle. Your game from 7.19.3: your hero fights a run of
// enemies, one at a time, with 1 attack, 2 guard and 3 potion. Today: H hosts
// a duel with a classmate on another computer.

// STEP: a JOIN code, '' until you join a classmate's room.

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
  // Returns the damage really taken.
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
// STEP: a duel flag, false until you host or join.

function setup() {
  new Canvas(480, 360);
  randomSeed(Date.now());
  newGame();
  // STEP: every move that arrives runs act, once it has been checked. Then join when JOIN has a code.
}

// STEP: a duel is Red against Blue, both fresh; otherwise the run of enemies.
function newGame() {
  enemies = KINDS.map((k) => new Fighter(k.name, k.hp, k.power, k.potions, k.color));
  which = 0;
  fighters = [new Fighter('Hero', 30, 3, 2, 'gold'), enemies[0]];
  turn = 0;
  over = false;
  message = 'Your turn: 1 attack, 2 guard, 3 potion';
}

// STEP: goodMove(m) and myTurn().

function draw() {
  background('#1b1d2a');
  // STEP: H hosts a duel. Only the seat whose turn it is may choose, and R works only offline.
  if (!over && turn === 0) {
    let a = 0;
    if (kb.presses('1')) a = 1;
    if (kb.presses('2')) a = 2;
    if (kb.presses('3')) a = 3;
    if (a !== 0) choose(a);
  }
  if (kb.presses('r') && over) newGame();
  fighters[0].draw(130, 150);
  fighters[1].draw(350, 150);
}

// You picked an action: it happens with a roll of 0 to 3.
// STEP: in a duel, the action and its roll are sent, not done here.
function choose(a) {
  act(turn, a, floor(random(0, 4)));
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
  // STEP: the computer enemy takes its turn only when this is not a duel.
  if (turn === 1) after(45, enemyTurn);
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
  // STEP: a duel ends with one winner, and Run again to play again.
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
  // STEP: offline, which fight and how to host; in a duel, the room's status.
  text('Fight ' + (which + 1) + ' of ' + enemies.length, 10, 46, 12, '#8393c4');
}
