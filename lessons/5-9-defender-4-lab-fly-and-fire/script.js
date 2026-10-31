// 5.9.4 Lab: Fly and fire.

const BASE_Y = 370;   // anything that falls below this line has reached the base

let ship, base;
let bullets, cooldown, playing;

function setup() {
  new Canvas(400, 400);

  base = new Sprite(200, 392, 400, 16, 'static');
  base.color = '#334';

  ship = new Sprite(200, 360, 36, 18, 'static');
  ship.color = 'deepskyblue';

  bullets = [];
  startRound();
}

// Left and right move the ship; two ifs keep it on the canvas.
function moveShip() {
  if (kb.pressing('left')) ship.x -= 5;
  if (kb.pressing('right')) ship.x += 5;
  // STEP 1: hold left for a while: the ship slides off the canvas. Add two ifs
  //   here that put it back: x no smaller than 20 and no bigger than 380.
}

// Holding Space fires, but only when the cooldown has counted down to 0.
function fire() {
  // STEP 2: count cooldown down by 1 while it is above 0. Then, when Space is
  //   held AND cooldown is 0: build a 6 by 14 sprite at (ship.x, ship.y - 18),
  //   set its collider to 'none' and its colour to 'yellow', push it onto
  //   bullets, and set cooldown to 12.
}

// Every shot climbs 8 pixels; one that has left the top is deleted and spliced out.
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 8;
    // STEP 3: a shot whose y is less than -20 has left the top. Delete it and
    //   splice it out of bullets, as Flappy did with its pipes.
  }
}

// Puts back everything a round owns. setup() uses it; 5.9.7 gives it to the R key too.
function startRound() {
  for (const b of bullets) b.delete();
  bullets = [];
  cooldown = 0;
  playing = true;
}

function draw() {
  background('#111');

  if (playing) {
    moveShip();
    fire();
    moveBullets();
  }
}

// drawTop() runs after the sprites, so nothing can cover the words.
function drawTop() {
  fill('white');
  textSize(18);
  text('shots alive: ' + bullets.length, 12, 26);
}
