// 6.15.5 Lab: A sound that varies (reference solution).
// Star catch: the arrow keys move the basket. Catch the falling star.

let basket, star;
let speed = 3;     // pixels the star falls each frame
let score = 0;     // stars caught
let misses = 0;    // stars that fell past the basket
let chime, thuds;  // thuds: a list of three low sounds
let music;         // the tune under the game
let level = 4;     // how loud the tune is, a whole number from 0 to 10

function setup() {
  new Canvas(400, 400);
  basket = new Sprite(200, 370, 70, 16, 'static');
  basket.color = 'orange';
  star = new Sprite(200, -10, 18);
  star.collider = 'none';   // nothing pushes the star: this code moves it
  star.color = 'gold';
  chime = loadSound('coin');
  thuds = [
    loadSound('coin'),
    loadSound('coin'),
    loadSound('coin'),
  ];
  thuds[0].rate = 0.4;   // three speeds of one file: three different thuds
  thuds[1].rate = 0.5;
  thuds[2].rate = 0.6;
  music = loadSound('music');
  music.volume = level / 10;   // 4 tenths: under the effects
  music.loop();                // starts when the file has arrived
}

// The star goes back to the top, at a random x.
function dropStar() {
  star.x = random(20, 380);
  star.y = -10;
}

// The arrow keys slide the basket, and it stays on the screen.
function moveBasket() {
  if (kb.pressing('left')) basket.x -= 6;
  if (kb.pressing('right')) basket.x += 6;
  if (basket.x < 35) basket.x = 35;
  if (basket.x > 365) basket.x = 365;
}

// The keys that change the sound.
function soundKeys() {
  if (kb.presses('up') && level < 10) {
    level += 1;
    music.volume = level / 10;
  }
  if (kb.presses('down') && level > 0) {
    level -= 1;
    music.volume = level / 10;
  }
  if (kb.presses('m')) {
    if (masterVolume() > 0) masterVolume(0);
    else masterVolume(1);
  }
}

function draw() {
  background('#112');
  moveBasket();
  soundKeys();
  star.y += speed;

  // A catch: the star touches the basket.
  if (star.overlaps(basket)) {
    score += 1;
    chime.rate = random(0.8, 1.25);   // a new pitch for every catch
    chime.play();
    dropStar();
  }

  // A miss: the star falls past the bottom.
  if (star.y > 410) {
    misses += 1;
    const pick = floor(random(thuds.length));   // 0, 1 or 2
    thuds[pick].play();
    dropStar();
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('caught: ' + score + '   missed: ' + misses, 12, 24);
  text('music: ' + level + ' of 10   sound: ' + (masterVolume() > 0 ? 'on' : 'off'), 12, 48);
}
