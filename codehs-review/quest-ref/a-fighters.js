// Quest: a turn-based battle. Day one: a Fighter class, and a hero and an
// enemy made from it, each drawn with an hp bar.

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

function setup() {
  new Canvas(480, 360);
  newGame();
}

function newGame() {
  fighters = [new Fighter('Hero', 30, 3, 'gold'), new Fighter('Goblin', 24, 4, 'orange')];
}

function draw() {
  background('#1b1d2a');
  fighters[0].draw(130, 150);
  fighters[1].draw(350, 150);
}

function drawTop() {
  text(fighters[0].name + ' vs ' + fighters[1].name, 10, 24, 15, 'white');
}
