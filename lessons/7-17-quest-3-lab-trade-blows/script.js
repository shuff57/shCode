// 7.17.3 Lab: Trade blows.
// Quest: a turn-based battle. Your fighters from 7.16.4: a hero and an enemy,
// each drawn with an hp bar. Today they take turns hitting each other.

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

  // STEP: takeHit(n) loses n hp, never below 0, and returns n, the size of the hit.
  // STEP: attack(target, roll) hits the target, through its takeHit, for this
  // fighter's power plus the roll.

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
// STEP: whose turn it is (0 or 1), a message, and whether the battle is over.

function setup() {
  new Canvas(480, 360);
  // STEP: a different fight every Run.
  newGame();
}

function newGame() {
  fighters = [new Fighter('Hero', 30, 3, 'gold'), new Fighter('Goblin', 24, 4, 'orange')];
  // STEP: you go first, the battle is not over, and the message says to press 1.
}

function draw() {
  background('#1b1d2a');
  // STEP: on your turn, 1 attacks with a roll of 0 to 3. Once the battle is over, R starts again.
  fighters[0].draw(130, 150);
  fighters[1].draw(350, 150);
}

// STEP: attackTurn(t, roll), enemyTurn() and fightOver(winner).

function drawTop() {
  // STEP: show the message instead of the names.
  text(fighters[0].name + ' vs ' + fighters[1].name, 10, 24, 15, 'white');
}
