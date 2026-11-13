// 5.6.2 Sub-build: One key, one sound (reference solution).
let flash = 0;
let blip;

function setup() {
  new Canvas(400, 300);
  blip = loadSound('coin');
}

function draw() {
  background('white');
  fill(flash > 0 ? 'orange' : 'lightgray');
  circle(200, 150, 120);
  if (flash > 0) flash -= 1;

  if (kb.presses('space')) {
    blip.play();
    flash = 12;
  }
}
