// 5.2.4 Lab: A beat and a one-shot (reference solution).

let lamp;
let on = false;
let message = '';

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0; // no falling: sprites stay where they are put (gravity is 5.2.6)

  lamp = new Sprite(200, 160, 100, 100);
  lamp.color = 'gray';
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('frame ' + frameCount, 20, 28);
  text(message, 20, 56);

  if (frameCount % 30 === 0) {
    on = !on;
  }

  if (frameCount === 300) {
    message = 'Time is up!';
    console.log('Time is up!');
  }

  if (on) {
    lamp.color = 'gold';
  } else {
    lamp.color = 'gray';
  }

  if (frameCount === 70) {
    console.log('Almost!');
  }
}
