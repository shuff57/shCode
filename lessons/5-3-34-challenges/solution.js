// 2.2.13 Challenges: reference solution.
// Demonstrates all three OOP stretches: Challenge 1 (Enemy.isAlive),
// Challenge 2 (Player class wrapping a sprite), Challenge 3 (PowerUp
// extends Collectible). Any one of the three is enough to pass the grader.

class Enemy {
  constructor(x, y, hp) {
    this.hp = hp;
    this.sprite = new Sprite(x, y, 24, 24);
    this.sprite.color = 'crimson';
    this.sprite.collider = 'none';
  }

  isAlive() {
    return this.hp > 0;
  }

  hit() {
    this.hp -= 1;
    if (!this.isAlive()) this.sprite.delete();
  }
}

class Player {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'white';
    this.sprite.collider = 'none';
  }

  move(dir) {
    if (dir === 'left')  this.sprite.vel.x = -3;
    else if (dir === 'right') this.sprite.vel.x =  3;
    else                       this.sprite.vel.x =  0;
  }

  jump() {
    this.sprite.vel.y = -6;
  }
}

class Collectible {
  constructor(x, y, value, color) {
    this.value = value;
    this.color = color;
    this.sprite = new Sprite(x, y, 18, 18);
    this.sprite.color = color;
    this.sprite.collider = 'none';
  }
}

class PowerUp extends Collectible {
  constructor(x, y, value, color) {
    super(x, y, value, color);
    this.sprite.diameter = 22;
  }

  boost() {
    return this.value * 2;
  }
}

let player, enemy, powerUp;
let score = 0;

function setup() {
  new Canvas(400, 400);
  player  = new Player(200, 300);
  enemy   = new Enemy(120, 120, 3);
  powerUp = new PowerUp(300, 120, 10, 'gold');
}

function draw() {
  background('#222');

  // Player movement (Challenge 2).
  if      (kb.pressing('a')) player.move('left');
  else if (kb.pressing('d')) player.move('right');
  else                       player.move('stop');
  if (kb.presses('space'))   player.jump();

  // Damage the enemy on tap (Challenge 1).
  if (kb.presses('x') && enemy.isAlive()) enemy.hit();

  // Collect the power-up on overlap (Challenge 3).
  if (powerUp && player.sprite.overlaps(powerUp.sprite)) {
    score += powerUp.boost();
    powerUp.sprite.delete();
    powerUp = null;
  }

  fill('white');
  textSize(14);
  text('Enemy HP: ' + enemy.hp + (enemy.isAlive() ? '': ' (dead)'), 12, 22);
  text('Score: ' + score, 12, 40);
  text('A/D move · SPACE jump · X attack', 12, 380);
}
