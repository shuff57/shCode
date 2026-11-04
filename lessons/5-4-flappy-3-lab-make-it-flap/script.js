// 5.10.5 Lab: Make it flap.

let bird;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 20;

  bird = new Sprite(100, 200, 24);
  bird.color = 'gold';
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('tap space to flap', 20, 28);

  // STEP 1: nothing lifts the bird yet. When the space bar is pressed,
  //   set bird.vel.y to a negative number.

  // STEP 2: if the bird leaves the top or bottom of the canvas, put it back
  //   in the middle: its position AND its speed.
}
