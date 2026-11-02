// 5.8.9 Lab: Give the class its own isAlive().

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

  // STEP 1: add an isAlive() method that returns true while this.hp is
  //   above 0. Nothing in the scene should have to compare this.hp again.
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

  // STEP 2: these two lines ask the same question twice, by hand.
  //   Replace both with calls to e.isAlive().
  text(e.hp > 0 ? 'hp: ' + e.hp : 'down', 20, 195);
  e.sprite.color = e.hp > 0 ? 'red' : '#555';

  text('press Space to hit for 2', 20, 22);
  if (kb.presses('space')) e.takeHit(2);
  e.sprite.text = String(e.hp);
}
