// 7.11.4 Challenges: Make it yours (reference solution: a best score, a boss wave,
// and a Ship class that owns its own cooldown).

const BASE_Y = 370;   // anything that falls below this line has reached the base

// A shot from the ship. It climbs until it hits something or leaves the top.
class Bullet {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 6, 14);
    this.sprite.collider = 'none';
    this.sprite.color = 'yellow';
    this.spent = false;
  }

  move() {
    this.sprite.y -= 8;
  }

  // Still in play: not used up, and not off the top.
  isAlive() {
    return !this.spent && this.sprite.y > -20;
  }

  // Does this shot touch that enemy? The parameter is another object.
  hits(enemy) {
    return this.isAlive() && enemy.isAlive() && this.sprite.overlaps(enemy.sprite);
  }

  spend() {
    this.spent = true;
  }

  remove() {
    this.sprite.delete();
  }
}

// One enemy. It keeps its own hp, worth and speed: no parallel arrays.
class Enemy {
  static spawned = 0;

  constructor(x, y, hp, speed) {
    this.hp = hp;
    this.worth = hp * 10;
    this.speed = speed;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.collider = 'none';
    this.sprite.color = hp > 1 ? 'orange' : 'crimson';
    this.sprite.text = String(hp);
    Enemy.spawned += 1;
  }

  move() {
    this.sprite.y += this.speed;
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = String(this.hp);
  }

  isAlive() {
    return this.hp > 0;
  }

  reachedBase() {
    return this.sprite.y > BASE_Y;
  }

  // Reaching the base uses the enemy up: it has no hp left to play with.
  land() {
    this.hp = 0;
  }

  remove() {
    this.sprite.delete();
  }
}

// Owns the waves: which wave it is, and the pause before the next one.
class Spawner {
  constructor() {
    this.wave = 0;
    this.pause = 60;
  }

  // While the field is clear the pause counts down. True when the next wave is due.
  ready(enemiesLeft) {
    if (enemiesLeft > 0) return false;
    this.pause -= 1;
    return this.pause <= 0;
  }

  // Builds the next wave and gives it back as a new array of enemies.
  makeWave() {
    this.wave += 1;
    this.pause = 90;
    const speed = 0.5 + this.wave * 0.25;
    const wave = [];
    for (let i = 0; i < this.wave + 2; i++) {
      const hp = i % 3 === 2 ? 3 : 1;
      wave.push(new Enemy(40 + floor(random(8)) * 45, -20 - i * 50, hp, speed));
    }
    // Challenge 2: every fifth wave ends with a slow boss that takes 10 hits.
    if (this.wave % 5 === 0) {
      const boss = new Enemy(200, -20 - (this.wave + 2) * 50, 10, speed / 2);
      boss.sprite.color = 'purple';
      wave.push(boss);
    }
    return wave;
  }
}

// Challenge 3: the ship is a class of its own, and the cooldown lives inside it.
class Ship {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 36, 18, 'static');
    this.sprite.color = 'deepskyblue';
    this.cooldown = 0;
  }

  move() {
    if (kb.pressing('left')) this.sprite.x -= 5;
    if (kb.pressing('right')) this.sprite.x += 5;
    if (this.sprite.x < 20) this.sprite.x = 20;
    if (this.sprite.x > 380) this.sprite.x = 380;
  }

  // Gives back a new Bullet when Space is held and the cooldown is done; otherwise null.
  fire() {
    if (this.cooldown > 0) this.cooldown -= 1;
    if (kb.pressing('space') && this.cooldown === 0) {
      this.cooldown = 12;
      return new Bullet(this.sprite.x, this.sprite.y - 18);
    }
    return null;
  }
}

let ship, base, spawner;
let bullets, enemies, score, baseHp, playing;
let best = 0;   // Challenge 1: never reset, so it survives R

function setup() {
  new Canvas(400, 400);

  base = new Sprite(200, 392, 400, 16, 'static');
  base.color = '#334';

  ship = new Ship(200, 360);

  bullets = [];
  enemies = [];
  startRound();
}

// Every shot climbs; one that leaves the top stops being alive, and clearFinished removes it.
function moveBullets() {
  for (const b of bullets) b.move();
}

// Every enemy falls. One that reaches the base costs 1 and is used up.
function moveEnemies() {
  for (const e of enemies) {
    e.move();
    if (e.isAlive() && e.reachedBase()) {
      baseHp -= 1;
      e.land();
    }
  }
  if (baseHp <= 0) {
    playing = false;
    if (score > best) best = score;
  }
}

// Every shot against every enemy. Nothing is spliced here: the objects only change.
function hitEnemies() {
  for (const b of bullets) {
    for (const e of enemies) {
      if (b.hits(e)) {
        b.spend();
        e.takeHit(1);
        if (!e.isAlive()) score += e.worth;
      }
    }
  }
}

// Finished objects leave in two places: the screen (remove) and the list (filter).
function clearFinished() {
  for (const b of bullets) {
    if (!b.isAlive()) b.remove();
  }
  bullets = bullets.filter((b) => b.isAlive());

  for (const e of enemies) {
    if (!e.isAlive()) e.remove();
  }
  enemies = enemies.filter((e) => e.isAlive());
}

// Puts back everything a round owns. setup() and the R key both use it.
function startRound() {
  for (const b of bullets) b.remove();
  bullets = [];
  for (const e of enemies) e.remove();
  enemies = [];
  spawner = new Spawner();
  Enemy.spawned = 0;
  ship.cooldown = 0;
  score = 0;
  baseHp = 3;
  playing = true;
}

function draw() {
  background('#111');

  if (playing) {
    ship.move();
    const shot = ship.fire();
    if (shot) bullets.push(shot);
    if (spawner.ready(enemies.length)) enemies = spawner.makeWave();
    moveBullets();
    moveEnemies();
    hitEnemies();
    clearFinished();
  }

  if (kb.presses('r')) startRound();
}

// drawTop() runs after the sprites, so nothing can cover the words.
function drawTop() {
  fill('white');
  textSize(18);
  text('score: ' + score, 12, 26);
  text('wave: ' + spawner.wave, 165, 26);
  text('base: ' + baseHp, 310, 26);
  text('best: ' + best, 12, 50);

  if (!playing) {
    textSize(30);
    text('Game over', 122, 190);
    textSize(14);
    text('enemies faced: ' + Enemy.spawned, 142, 216);
    text('press R to play again', 128, 238);
  }
}
