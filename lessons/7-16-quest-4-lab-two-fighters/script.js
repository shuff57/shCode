// 7.16.4 Lab: Two fighters.
// Quest: a turn-based battle. Day one: a Fighter class, and a hero and an
// enemy made from it. The fighters are made; their draw method is empty.

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

  draw(x, y) {
    // STEP: a circle for the body (grey once it has no hp left) with the name under it,
    // then an hp bar: a grey rect 120 wide, and on top of it a rect 120 * this.hp / this.maxHp wide.
  }
}

let fighters;             // fighters[0] is you, fighters[1] the one you face

function setup() {
  new Canvas(480, 360);
  newGame();
}

function newGame() {
  fighters = [new Fighter('Hero', 30, 3, 'gold'), new Fighter('Goblin', 24, 4, 'orange')];
}

function draw() {
  background('#1b1d2a');
  // STEP: each fighter draws itself: you at (130, 150), the one you face at (350, 150).
}

function drawTop() {
  text(fighters[0].name + ' vs ' + fighters[1].name, 10, 24, 15, 'white');
}
