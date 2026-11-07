// Quest: a turn-based battle. Your hero fights one enemy: on your turn press
// 1 to attack, and the enemy hits back.

class Fighter {
  constructor(name, maxHp, power, color) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.power = power;
    this.color = color;
  }

  isAlive() {
    return this.hp > 0;
  }

  // Lose n hp, never below 0. Returns n, the size of the hit.
  takeHit(n) {
    this.hp = max(this.hp - n, 0);
    return n;
  }

  // Hit another fighter for this fighter's power plus a roll of 0 to 3.
  attack(target, roll) {
    return target.takeHit(this.power + roll);
  }

  draw(x, y) {
    fill(this.isAlive() ? this.color : '#555');
    circle(x, y, 70);
    text(this.name, x - 40, y + 60, 16, 'white');
    fill('#333');
    rect(x - 60, y + 70, 120, 10);
    fill(this.hp > this.maxHp / 3 ? 'limegreen' : 'tomato');
    rect(x - 60, y + 70, 120 * this.hp / this.maxHp, 10);
    text(this.hp + '/' + this.maxHp, x - 60, y + 98, 12, '#ccc');
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
  fighters = [new Fighter('Hero', 30, 3, 'gold'), new Fighter('Goblin', 24, 4, 'orange')];
  turn = 0;
  over = false;
  message = 'Your turn: press 1 to attack';
}

function draw() {
  background('#1b1d2a');
  if (!over && turn === 0 && kb.presses('1')) attackTurn(0, floor(random(0, 4)));
  if (kb.presses('r') && over) newGame();
  fighters[0].draw(130, 150);
  fighters[1].draw(350, 150);
}

// Fighter t attacks the other one with a roll of 0 to 3, then the turn passes.
function attackTurn(t, roll) {
  const me = fighters[t];
  const them = fighters[1 - t];
  message = me.name + ' hits ' + them.name + ' for ' + me.attack(them, roll);
  if (!them.isAlive()) {
    fightOver(t);
    return;
  }
  turn = 1 - turn;
  if (turn === 1) after(45, enemyTurn);
}

// The enemy's turn comes 45 frames later, so you can see what happened.
function enemyTurn() {
  if (over || turn !== 1) return;
  attackTurn(1, floor(random(0, 4)));
}

function fightOver(winner) {
  over = true;
  if (winner === 0) message = 'You beat the ' + fighters[1].name + '! Press R to play again';
  else message = 'The ' + fighters[1].name + ' beat you. Press R to try again';
}

function drawTop() {
  text(message, 10, 24, 15, 'white');
}
