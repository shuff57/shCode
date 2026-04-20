/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.3.1 Introducing Groups — spawn, iterate, remove.

let stars;

function setup() {
  new Canvas(400, 400);

  stars = new Group();
  stars.color = 'yellow';
  stars.diameter = 10;
  stars.collider = 'none';
}

function update() {
  if (frameCount % 10 === 0) {
    let s = new stars.Sprite(Math.random() * 400, 0);
    s.vel.y = 2 + Math.random() * 2;
  }

  for (let s of [...stars]) {
    if (s.y > 450) s.remove();
  }
}

function draw() {
  background('#001133');
}
