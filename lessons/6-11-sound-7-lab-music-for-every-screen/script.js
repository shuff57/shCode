// 6.11.7 Lab: Music for every screen.
// Star catch with screens: Enter plays, 10 catches win, 3 misses lose, R goes back to the title.

let basket, star;
let speed = 3;     // pixels the star falls each frame
let score = 0;     // stars caught
let misses = 0;    // stars that fell past the basket
let state;         // the screen: 'title', 'play', 'won' or 'lost'
let chime, thuds;  // the sound effects from 6.11.5
let music;         // one tune for every screen

function setup() {
  new Canvas(400, 400);
  basket = new Sprite(200, 370, 70, 16, 'static');
  basket.color = 'orange';
  star = new Sprite(200, -10, 18);
  star.collider = 'none';   // nothing pushes the star: this code moves it
  star.color = 'gold';
  chime = loadSound('/moshion/assets/coin.wav');
  thuds = [
    loadSound('/moshion/assets/coin.wav'),
    loadSound('/moshion/assets/coin.wav'),
    loadSound('/moshion/assets/coin.wav'),
  ];
  thuds[0].rate = 0.4;   // three speeds of one file: three different thuds
  thuds[1].rate = 0.5;
  thuds[2].rate = 0.6;
  music = loadSound('/moshion/assets/music.wav');
  music.volume = 0.4;    // the tune sits under the effects
  goTo('title');
}

// Every change of screen comes through here, once.
function goTo(next) {
  // STEP 1: stop whatever is playing.
  state = next;
  // STEP 2: loop the tune on the title (rate 0.8) and in the game (rate 1).
  // STEP 3: play it once for a win (rate 1.25) and for a loss (rate 0.6).
}

// A new game: nothing caught, nothing missed, the basket in the middle.
function startGame() {
  score = 0;
  misses = 0;
  basket.x = 200;
  dropStar();
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

// One frame of the game: the star falls, and is caught or missed.
function playGame() {
  moveBasket();
  star.y += speed;

  if (star.overlaps(basket)) {
    score += 1;
    chime.rate = random(0.8, 1.25);
    chime.play();
    dropStar();
  }

  if (star.y > 410) {
    misses += 1;
    const pick = floor(random(thuds.length));
    thuds[pick].play();
    dropStar();
  }

  if (score >= 10) goTo('won');
  if (misses >= 3) goTo('lost');
}

function draw() {
  background('#112');
  if (state === 'title') {
    if (kb.presses('enter')) {
      startGame();
      goTo('play');
    }
  } else if (state === 'play') {
    playGame();
  } else {
    if (kb.presses('r')) {
      dropStar();
      goTo('title');
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  if (state === 'title') {
    textSize(30);
    text('Star catch', 110, 150);
    textSize(16);
    text('Press Enter to play', 110, 200);
    text('Catch 10 to win. Miss 3 and you lose.', 22, 230);
    return;
  }
  text('caught: ' + score + '   missed: ' + misses, 12, 24);
  if (state === 'won') text('You caught 10! Press R', 95, 200);
  if (state === 'lost') text('Three got away. Press R', 90, 200);
}
