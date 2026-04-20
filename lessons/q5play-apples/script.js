/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.3.2 Apple Catcher — catch falling apples with a basket.

let basket, apples, score = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0; // apples have their own vel

  basket = new Sprite(200, 370, 70, 15, 'kinematic');
  basket.color = 'saddlebrown';

  apples = new Group();
  apples.color = 'red';
  apples.diameter = 22;
  apples.collider = 'none';
}

function update() {
  if (kb.pressing('left')) basket.vel.x = -4;
  else if (kb.pressing('right')) basket.vel.x = 4;
  else basket.vel.x = 0;

  if (frameCount % 30 === 0) {
    let a = new apples.Sprite(20 + Math.random() * 360, -20);
    a.vel.y = 3;
  }

  for (let a of [...apples]) {
    if (a.overlapping(basket)) {
      score++;
      a.remove();
    } else if (a.y > 450) {
      a.remove();
    }
  }
}

function draw() {
  background('#113311');
  fill('white');
  textSize(24);
  text('Score: ' + score, 14, 30);
}
