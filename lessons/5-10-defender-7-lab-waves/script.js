// 5.10.7 Lab: Waves.

const BASE_Y = 370;   // anything that falls below this line has reached the base

let ship, base;
let bullets, cooldown, score, baseHp, playing;

// Three parallel arrays: index j in all three is the same enemy.
let enemies, enemyHp, enemyWorth;

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
    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
    b.collider = 'none';
    b.color = 'yellow';
    bullets.push(b);
    cooldown = 12;
  }
}

// Every shot climbs 8 pixels; one that has left the top is deleted and spliced out.
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 8;
    if (bullets[i].y < -20) {
      bullets[i].delete();
      bullets.splice(i, 1);
    }
  }
}

// Builds one enemy and adds it to all three arrays, so they stay in step.
function spawnEnemy(x, y, hp) {
  const e = new Sprite(x, y, 30, 30);
  e.collider = 'none';
  e.color = hp > 1 ? 'orange' : 'crimson';
  e.text = String(hp);
  enemies.push(e);
  enemyHp.push(hp);
  enemyWorth.push(hp * 10);
}

// One wave: two more enemies than the wave number, in a column above the top,
// every third one tough. Each wave falls a little faster.
function spawnWave() {
  // STEP 3: add 1 to wave and set fallSpeed to 0.5 + wave * 0.25. Then loop
  //   wave + 2 times; on loop number i, hp is 3 when i % 3 === 2 and 1 otherwise,
  //   and spawnEnemy(40 + floor(random(8)) * 45, -20 - i * 50, hp).
}

// While the field is clear, the pause counts down; at 0 the next wave comes.
function nextWave() {
  // STEP 2: if any enemies are left, return. Otherwise count wavePause down by 1,
  //   and when it reaches 0, call spawnWave() and set wavePause back to 90.
}

// Every enemy falls. One that reaches the base costs 1 and is removed from all three arrays.
function moveEnemies() {
  for (let j = enemies.length - 1; j >= 0; j--) {
    enemies[j].y += fallSpeed;
    if (enemies[j].y > BASE_Y) {
      baseHp -= 1;
      enemies[j].delete();
      enemies.splice(j, 1);
      enemyHp.splice(j, 1);
      enemyWorth.splice(j, 1);
    }
  }
  if (baseHp <= 0) playing = false;
}

// Every shot against every enemy. A hit removes the shot and takes 1 hp;
// an enemy at 0 hp scores its worth and is removed from all three arrays.
function hitEnemies() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (bullets[i].overlaps(enemies[j])) {
        bullets[i].delete();
        bullets.splice(i, 1);
        enemyHp[j] -= 1;
        enemies[j].text = String(enemyHp[j]);
        if (enemyHp[j] <= 0) {
          score += enemyWorth[j];
          enemies[j].delete();
          enemies.splice(j, 1);
          enemyHp.splice(j, 1);
          enemyWorth.splice(j, 1);
        }
        break;   // this shot is gone: stop testing it against the others
      }
    }
  }
}

// Puts back everything a round owns. setup() and the R key both use it.
function startRound() {
  for (const b of bullets) b.delete();
  bullets = [];
  for (const e of enemies) e.delete();
  enemies = [];
  enemyHp = [];
  enemyWorth = [];
  // STEP 1: every round starts at wave 0, with a pause of 60 frames.
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
