// 5.5.18 Lab: Build a wave.

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

  // STEP 1: when the field is clear, send a wave of three enemies on a
  //   frameCount timer of your choosing (90 frames is the example's).
  //   The three arrive at x = 90, 260 and 430, all at y = 100.

  // STEP 2: Space hits the first enemy in the list.

  // STEP 3: keep only the enemies that are still alive.
}
