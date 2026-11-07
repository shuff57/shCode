// 7.18.3 Lab: Attack, guard or potion.
// Quest: a turn-based battle. Your game from 7.17.3: on your turn press 1 to
// attack, and the enemy hits back. Today: 2 guards and 3 drinks a potion.

class Fighter {
  constructor(name, maxHp, power, color) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.power = power;
    this.color = color;
    // STEP: a guarding flag (off at the start) and a potions count (a new constructor value).
  }

  isAlive() {
    return this.hp > 0;
  }

  // Lose n hp, never below 0. Returns the damage taken.
  takeHit(n) {
    // STEP: while guarding, the hit is halved, rounded down, and any hit ends the guard.
    this.hp = max(this.hp - n, 0);
    return n;
  }

  // Hit another fighter for this fighter's power plus a roll of 0 to 3.
  attack(target, roll) {
    return target.takeHit(this.power + roll);
  }

  // STEP: guard(), and heal(): a potion gives up to 12 hp back, never above maxHp.

  draw(x, y) {
    fill(this.isAlive() ? this.color : '#555');
    circle(x, y, 70);
    // STEP: a gold ring while guarding, and the potions under the bar.
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
  // STEP: on your turn, 1, 2 or 3 picks the action, and choose(a) does it.
  if (!over && turn === 0 && kb.presses('1')) attackTurn(0, floor(random(0, 4)));
  if (kb.presses('r') && over) newGame();
  fighters[0].draw(130, 150);
  fighters[1].draw(350, 150);
}

// Fighter t attacks the other one with a roll of 0 to 3, then the turn passes.
// STEP: this becomes act(t, a, roll): a is 1 attack, 2 guard or 3 potion.
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
  // STEP: the enemy chooses: a potion when it is low and has one, else guard one time in four, else attack.
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
