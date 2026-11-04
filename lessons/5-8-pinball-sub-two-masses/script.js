// 5.8.2 Sub-build: Two balls, two masses.
// Both balls sit still. Press P and nothing happens yet.

let heavy, light;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;

  heavy = new Sprite(120, 150, 30);
  heavy.color = 'sienna';

  light = new Sprite(120, 230, 30);
  light.color = 'deepskyblue';

  // STEP 1: give the two balls different masses.
}

function draw() {
  background('white');
  textSize(16);
  text('Press P to push both', 12, 24);

  // STEP 2: on P, push both with the same force.
}
