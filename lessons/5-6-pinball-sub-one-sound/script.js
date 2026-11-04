// 5.6.2 Sub-build: One key, one sound.
// Press Space: the circle flashes. There is no sound yet.

let flash = 0;

function setup() {
  new Canvas(400, 300);
  // STEP 1: load the sound once, here.
}

function draw() {
  background('white');
  fill(flash > 0 ? 'orange' : 'lightgray');
  circle(200, 150, 120);
  if (flash > 0) flash -= 1;

  // STEP 2: on Space, play the sound and flash the circle.
  if (kb.presses('space')) {
    flash = 12;
  }
}
