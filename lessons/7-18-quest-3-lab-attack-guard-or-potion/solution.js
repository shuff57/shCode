// Quest: a turn-based battle. Your hero fights one enemy: on your turn press
// 1 to attack, 2 to guard (the next hit is halved) or 3 to drink a potion.

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
let message = '';
let over = false;         // true when the battle has ended

function setup() {
  new Canvas(480, 360);
  randomSeed(Date.now());
  newGame();
}

function newGame() {
  fighters = [new Fighter('Hero', 30, 3, 2, 'gold'), new Fighter('Goblin', 24, 5, 1, 'orange')];
  turn = 0;
  over = false;
  message = 'Your turn: 1 attack, 2 guard, 3 potion';
}

function draw() {
  background('#1b1d2a');
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
  over = true;
  if (winner === 0) message = 'You beat the ' + fighters[1].name + '! Press R to play again';
  else message = 'The ' + fighters[1].name + ' beat you. Press R to try again';
}

function drawTop() {
  text(message, 10, 24, 15, 'white');
}
