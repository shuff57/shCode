// 5.5.8 Lab: takeHit with a floor at zero.

class Enemy {
  constructor(x, y) {
    this.hp = 5;
    this.sprite = new Sprite(x, y, 40, 40);
    this.sprite.color = 'red';
  }

  takeHit(n) {
    // STEP 1: take n off this.hp.
    // STEP 2: then keep the result from going below 0.
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
  text('hp: ' + e.hp, 20, 195);
  text('press Space to hit for 2', 20, 22);
  if (kb.presses('space')) e.takeHit(2);
  e.sprite.text = String(e.hp);
  e.sprite.color = e.isAlive() ? 'red' : '#555';
}
