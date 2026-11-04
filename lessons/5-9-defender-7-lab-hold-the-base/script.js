// 7.5.3 Lab: Hold the base, and start again.

const BASE_Y = 370;   // anything that falls below this line has reached the base

let ship, base, drone;
let bullets, cooldown, score, baseHp, playing;

function setup() {
  new Canvas(400, 400);

  base = new Sprite(200, 392, 400, 16, 'static');
  base.color = '#334';

  ship = new Sprite(200, 360, 36, 18, 'static');
  ship.color = 'deepskyblue';

  drone = new Sprite(200, -20, 28, 28);
  drone.collider = 'none';
  drone.color = 'crimson';

  bullets = [];
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

// Puts the drone back above the top of the screen at a random x.
function resetDrone() {
  drone.x = random(30, 370);
  drone.y = -20;
}

// The drone falls; when it reaches the base the base loses 1 and the drone starts again.
function moveDrone() {
  drone.y += 1.5;
  if (drone.y > BASE_Y) {
    // STEP 2: reaching the base costs the base 1, and at 0 the round is over
    //   (playing = false). Everything inside if (playing) in draw() then stops.
    resetDrone();
  }
}

// A shot that overlaps the drone scores 1, leaves the screen and the array, and resets the drone.
function hitDrone() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].overlaps(drone)) {
      bullets[i].delete();
      bullets.splice(i, 1);
      score += 1;
      resetDrone();
    }
  }
}

// Puts back everything a round owns. setup() and the R key both use it.
function startRound() {
  for (const b of bullets) b.delete();
  bullets = [];
  resetDrone();
  cooldown = 0;
  score = 0;
  // STEP 1: give the base 3 hp at the start of every round.
  playing = true;
}

function draw() {
  background('#111');

  if (playing) {
    moveShip();
    fire();
    moveBullets();
    moveDrone();
    hitDrone();
  }

  // STEP 3 (second half): pressing R starts a new round.
}

// drawTop() runs after the sprites, so nothing can cover the words.
function drawTop() {
  fill('white');
  textSize(18);
  text('score: ' + score, 12, 26);
  text('base: ' + baseHp, 310, 26);

  // STEP 3: when the round is over, write Game over and press R to play again
  //   in the middle of the screen.
}
