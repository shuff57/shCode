// 5.6.4 Debugging: The sound on every frame (reference solution).
let blip, flash = 0;

function setup() {
  new Canvas(400, 300);
  blip = loadSound('/moshion/assets/coin.wav');
}

function draw() {
  background('white');
  fill(flash > 0 ? 'orange' : 'lightgray');
  circle(200, 150, 120);

  if (kb.presses('space')) {
    blip.play();
    flash = 12;
  }

  if (flash > 0) flash -= 1;
}
