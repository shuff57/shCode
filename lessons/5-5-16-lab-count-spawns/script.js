// 5.8.16 Lab: Count your spawns.

// STEP 1: give the class a shared counter named `spawned` that belongs to
//   the class itself, not to any one enemy. It starts at 0.

class Enemy {
  constructor(x, y) {
    this.hp = 4;
    this.sprite = new Sprite(x, y, 34, 34);
    this.sprite.color = 'red';
    this.sprite.text = String(this.hp);

    // STEP 2: count this new enemy on the class's counter.
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = String(this.hp);
  }

  isAlive() {
    return this.hp > 0;
  }
}

let enemies = [];

function setup() {
  new Canvas(480, 260);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('enemies ever built: ' + Enemy.spawned, 20, 28);
  text('still here: ' + enemies.length, 20, 52);
  text('click to spawn one  ·  Space hits the first', 20, 240);

  if (mouse.presses()) enemies.push(new Enemy(mouse.x, mouse.y));
  if (kb.presses('space') && enemies.length > 0) enemies[0].takeHit(1);

  enemies = enemies.filter((e) => e.isAlive());
}
