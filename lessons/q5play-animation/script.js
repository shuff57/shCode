/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.4.1 Animated Sprites — drive properties off frameCount.
// Uncomment each STEP and fill in the code.

let s;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  // STEP 1: Create a sprite with collider 'none' so physics doesn't interfere
  //   s = new Sprite(200, 200, 60, 60);
  //   s.collider = 'none';
}

function update() {
  // STEP 2: Rotate over time. frameCount / 30 gives a full turn every ~6s
  //   s.rotation = frameCount / 30;

  // STEP 3: Breathe the scale using a sine wave
  //   s.scale = 1 + 0.3 * Math.sin(frameCount / 10);

  // STEP 4: Pulse the color by alternating every 30 frames
  //   s.color = (frameCount % 60 < 30) ? 'cyan' : 'magenta';
}

function draw() {
  // STEP 5: Clear the background
  //   background('#111');
}
