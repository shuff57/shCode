// 5.6.4 Debugging: The sound on every frame (starter, with both bugs).
let blip, flash = 0;

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('white');
  fill(flash > 0 ? 'orange' : 'lightgray');
  circle(200, 150, 120);

  // BUG 2: loading every frame.
  blip = loadSound('/moshion/assets/coin.wav');

  if (kb.presses('space')) {
    flash = 12;
  }

  // BUG 1: playing every frame, whether or not the key was pressed.
  blip.play();

  if (flash > 0) flash -= 1;
}
