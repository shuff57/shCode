// 5.5.13 Lab: Reap the dead with filter.

class Enemy {
  constructor(x, y) {
    this.hp = 4;
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

class Player {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 36, 36);
    this.sprite.color = 'white';
    this.power = 2;
  }

  hit(other) {
    other.takeHit(this.power);
  }
}

let p;
let enemies = [];

function setup() {
  new Canvas(460, 260);
  p = new Player(80, 130);
  enemies.push(new Enemy(190, 90));
  enemies.push(new Enemy(300, 175));
  enemies.push(new Enemy(400, 110));
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('press Space to hit the first enemy', 20, 22);
  text('enemies in the list: ' + enemies.length, 20, 240);

  if (kb.presses('space') && enemies.length > 0) p.hit(enemies[0]);

  // STEP 1: an enemy that reaches 0 hp is still in the list, so it stays
  //   at the front and the list never gets shorter. Build a NEW list that
  //   keeps only the enemies that are still alive, and store it back in
  //   `enemies`. Put this before the loop below.

  for (const e of enemies) {
    e.sprite.text = String(e.hp);
    e.sprite.color = e.isAlive() ? 'red' : '#555';
  }
}
