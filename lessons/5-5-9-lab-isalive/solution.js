// 5.8.9 Lab: Give the class its own isAlive() (reference solution).

class Enemy {
  constructor(x, y) {
    this.hp = 6;
    this.sprite = new Sprite(x, y, 40, 40);
    this.sprite.color = 'red';
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
  }

  isAlive() {
    return this.hp > 0;
  }
}

let e;

function setup() {
  new Canvas(360, 220);
  e = new Enemy(180, 100);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);

  text(e.isAlive() ? 'hp: ' + e.hp : 'down', 20, 195);
  e.sprite.color = e.isAlive() ? 'red' : '#555';

  text('press Space to hit for 2', 20, 22);
  if (kb.presses('space')) e.takeHit(2);
  e.sprite.text = String(e.hp);
}
