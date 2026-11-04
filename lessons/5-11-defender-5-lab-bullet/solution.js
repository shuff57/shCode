// 7.10.1 Lab: Bullet, and a hit that takes an enemy (reference solution).

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
  constructor(x, y, hp, speed) {
    this.hp = hp;
    this.worth = hp * 10;
    this.speed = speed;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.collider = 'none';
    this.sprite.color = hp > 1 ? 'orange' : 'crimson';
    this.sprite.text = String(hp);
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

let ship, base;
let bullets, cooldown, score, baseHp, playing;
let enemies;
let wave, wavePause, fallSpeed;

function setup() {
  new Canvas(400, 400);

  base = new Sprite(200, 392, 400, 16, 'static');
  base.color = '#334';

  ship = new Sprite(200, 360, 36, 18, 'static');
  ship.color = 'deepskyblue';

  bullets = [];
  enemies = [];
  startRound();
}

// Left and right move the ship; two ifs keep it on the canvas.
function moveShip() {
  if (kb.pressing('left')) ship.x -= 5;
  if (kb.pressing('right')) ship.x += 5;
  if (ship.x < 20) ship.x = 20;
  if (ship.x > 380) ship.x = 380;
}

// Holding Space fires, but only when the cooldown has counted down to 0.
function fire() {
  if (cooldown > 0) cooldown -= 1;
  if (kb.pressing('space') && cooldown === 0) {
    bullets.push(new Bullet(ship.x, ship.y - 18));
    cooldown = 12;
  }
}

// Every shot climbs; one that leaves the top stops being alive, and clearFinished removes it.
function moveBullets() {
  for (const b of bullets) b.move();
}

// One line now: the enemy carries its own hp, worth and speed.
function spawnEnemy(x, y, hp) {
  enemies.push(new Enemy(x, y, hp, fallSpeed));
}

// One wave: two more enemies than the wave number, in a staggered line above the top,
// every third one tough. Each wave falls a little faster.
function spawnWave() {
  wave += 1;
  fallSpeed = 0.5 + wave * 0.25;
  for (let i = 0; i < wave + 2; i++) {
    const hp = i % 3 === 2 ? 3 : 1;
    spawnEnemy(40 + floor(random(8)) * 45, -20 - i * 50, hp);
  }
}

// While the field is clear, the pause counts down; at 0 the next wave comes.
function nextWave() {
  if (enemies.length > 0) return;
  wavePause -= 1;
  if (wavePause <= 0) {
    spawnWave();
    wavePause = 90;
  }
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
  if (baseHp <= 0) playing = false;
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
  wave = 0;
  wavePause = 60;
  fallSpeed = 1;
  cooldown = 0;
  score = 0;
  baseHp = 3;
  playing = true;
}

function draw() {
  background('#111');

  if (playing) {
    moveShip();
    fire();
    nextWave();
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
  text('wave: ' + wave, 165, 26);
  text('base: ' + baseHp, 310, 26);

  if (!playing) {
    textSize(30);
    text('Game over', 122, 190);
    textSize(14);
    text('press R to play again', 128, 216);
  }
}
