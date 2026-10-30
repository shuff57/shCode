// 5.5.18 Lab: Build a wave (reference solution).

class Enemy {
  static spawned = 0;

  constructor(x, y) {
    this.hp = 3;
    this.sprite = new Sprite(x, y, 34, 34);
    this.sprite.color = '#e04a4a';
    this.sprite.text = String(this.hp);
    Enemy.spawned += 1;
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = this.isAlive() ? String(this.hp) : '';
  }

  isAlive() {
    return this.hp > 0;
  }
}

let enemies = [];

function setup() {
  new Canvas(520, 300);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('ever spawned: ' + Enemy.spawned, 20, 28);
  text('still here:   ' + enemies.length, 20, 52);
  text('Space hits the first', 20, 285);

  if (enemies.length === 0 && frameCount % 90 === 0) {
    enemies.push(new Enemy(90, 100));
    enemies.push(new Enemy(260, 100));
    enemies.push(new Enemy(430, 100));
  }

  if (kb.presses('space') && enemies.length > 0) enemies[0].takeHit(1);

  enemies = enemies.filter((e) => e.isAlive());
}
