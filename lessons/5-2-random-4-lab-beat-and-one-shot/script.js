// 5.2.4 Lab: A beat and a one-shot.

let lamp;
let on = false;
let message = '';

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;

  lamp = new Sprite(200, 160, 100, 100);
  lamp.color = 'gray';
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('frame ' + frameCount, 20, 28);
  text(message, 20, 56);

  // STEP 1: a beat. Every 30 frames, flip `on`: if it is true make it
  //   false, and if it is false make it true.

  // STEP 2: a one-shot. On frame 300 (five seconds), set `message` to
  //   'Time is up!' and log it. It must happen once, not on every frame.

  if (on) {
    lamp.color = 'gold';
  } else {
    lamp.color = 'gray';
  }

  // STEP 3: this halfway check should log 'Almost!' on frame 70, but it
  //   never does. Once your beat works, find out why and fix it.
  if (on) {
    if (frameCount === 70) {
      console.log('Almost!');
    }
  }
}
