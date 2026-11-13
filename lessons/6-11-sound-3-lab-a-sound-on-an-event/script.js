// 6.15.3 Lab: A sound on an event.
// Star catch: the arrow keys move the basket. Catch the falling star.

let basket, star;
let speed = 3;     // pixels the star falls each frame
let score = 0;     // stars caught
let misses = 0;    // stars that fell past the basket
let chime, thud;   // the two sounds, loaded once in setup()

function setup() {
  new Canvas(400, 400);
  basket = new Sprite(200, 370, 70, 16, 'static');
  basket.color = 'orange';
  star = new Sprite(200, -10, 18);
  star.collider = 'none';   // nothing pushes the star: this code moves it
  star.color = 'gold';
  // STEP 1: load two sounds here, once: the chime from the 'coin' sound, and
  //   the thud from the same sound at half speed.
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

function draw() {
  background('#112');
  moveBasket();
  star.y += speed;

  // A catch: the star touches the basket.
  if (star.overlaps(basket)) {
    score += 1;
    // STEP 2: play the chime here, once for each catch.
    dropStar();
  }

  // A miss: the star falls past the bottom.
  if (star.y > 410) {
    misses += 1;
    // STEP 3: play the thud here, once for each miss.
    dropStar();
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('caught: ' + score + '   missed: ' + misses, 12, 24);
}
