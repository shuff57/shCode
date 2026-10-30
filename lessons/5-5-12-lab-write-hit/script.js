// 5.5.12 Lab: Write hit(other).

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

class Player {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 36, 36);
    this.sprite.color = 'white';
    this.power = 2;
  }

  // STEP 1: write hit(other) so that it asks the OTHER object to take
  //   this player's power as damage. The enemy already knows how to
  //   take a hit; this method is the player's side of the exchange.
}

let p, e;

function setup() {
  new Canvas(400, 240);
  p = new Player(120, 120);
  e = new Enemy(260, 120);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('enemy hp: ' + e.hp, 20, 215);
  text('press Space to hit the enemy', 20, 22);

  if (kb.presses('space')) p.hit(e);

  e.sprite.text = String(e.hp);
  e.sprite.color = e.isAlive() ? 'red' : '#555';
}
