// 6.15.10 Challenges: Make it yours. Pick one sound rule and add it.

let basket, star;
let speed = 3;     // pixels the star falls each frame
let score = 0;     // stars caught
let misses = 0;    // stars that fell past the basket
let state;         // the screen: 'title', 'settings', 'play', 'won' or 'lost'
let chime, thuds;  // the sound effects from 6.15.5
let music;         // one tune for every screen
let level = 5;     // how loud everything is, a whole number from 0 to 10
let muted = false; // true turns every sound off

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
  music.volume = 0.4;    // the tune sits under the effects
  loadSettings();
  applySound();
  goTo('title');
}

// The saved options, read back once when the game starts.
function loadSettings() {
  const savedLevel = getItem('mySoundLevel');
  if (savedLevel !== null) level = savedLevel;
  const savedMuted = getItem('mySoundMuted');
  if (savedMuted !== null) muted = savedMuted;
}

// Every sound at once: silent when muted, or level tenths of full.
function applySound() {
  masterVolume(muted ? 0 : level / 10);
}

// After any change: hear it, and keep it.
function soundChanged() {
  applySound();
  chime.play();          // a sample, so the player hears the new level
  storeItem('mySoundLevel', level);
  storeItem('mySoundMuted', muted);
}

// The sound options screen: one frame of it.
function settingsScreen() {
  if (kb.presses('up') && level < 10) {
    level += 1;
    soundChanged();
  }
  if (kb.presses('down') && level > 0) {
    level -= 1;
    soundChanged();
  }
  if (kb.presses('m')) {
    muted = !muted;
    soundChanged();
  }
  if (kb.presses('o')) goTo('title');
}

// Every change of screen comes through here, once.
function goTo(next) {
  music.stop();          // whatever was playing stops first
  state = next;
  if (next === 'title' || next === 'settings') {
    music.rate = 0.8;    // slower and lower: a calm title
    music.loop();
  }
  if (next === 'play') {
    music.rate = 1;      // the tune as it was made
    music.loop();
  }
  if (next === 'won') {
    music.rate = 1.25;   // faster and higher, once
    music.play();
  }
  if (next === 'lost') {
    music.rate = 0.6;    // slow and low, once
    music.play();
  }
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
    if (kb.presses('o')) goTo('settings');
  } else if (state === 'settings') {
    settingsScreen();
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
    text('O: sound options', 124, 280);
    return;
  }
  if (state === 'settings') {
    textSize(24);
    text('Sound options', 106, 120);
    textSize(16);
    text('level: ' + level + ' of 10   (up and down)', 55, 180);
    text('sound: ' + (muted ? 'off' : 'on') + '   (M)', 120, 210);
    text('O: back to the title', 104, 270);
    return;
  }
  text('caught: ' + score + '   missed: ' + misses, 12, 24);
  if (state === 'won') text('You caught 10! Press R', 95, 200);
  if (state === 'lost') text('Three got away. Press R', 90, 200);
}
