// 6.15.4 Lab: Music, volume and a mute key.
// Star catch: the arrow keys move the basket. Catch the falling star.

let basket, star;
let speed = 3;     // pixels the star falls each frame
let score = 0;     // stars caught
let misses = 0;    // stars that fell past the basket
let chime, thud;   // the two sound effects from 6.15.3
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
  thud = loadSound('coin');
  thud.rate = 0.5;   // the same file, slower and lower
  // STEP 1: load the tune, set its volume from level, and start it looping.
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
  // STEP 2: up adds 1 to level (only below 10) and down takes 1 away (only
  //   above 0); each time, set the tune's volume from level.
  // STEP 3: M turns every sound off, and on again.
}

function draw() {
  background('#112');
  moveBasket();
  soundKeys();
  star.y += speed;

  // A catch: the star touches the basket.
  if (star.overlaps(basket)) {
    score += 1;
    chime.play();
    dropStar();
  }

  // A miss: the star falls past the bottom.
  if (star.y > 410) {
    misses += 1;
    thud.play();
    dropStar();
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('caught: ' + score + '   missed: ' + misses, 12, 24);
  text('music: ' + level + ' of 10   sound: ' + (masterVolume() > 0 ? 'on' : 'off'), 12, 48);
}
