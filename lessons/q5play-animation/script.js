/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.4.1 Animated Sprites — drive properties off frameCount.

let s;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  s = new Sprite(200, 200, 60, 60);
  s.collider = 'none';
}

function update() {
  s.rotation = frameCount / 30;
  s.scale = 1 + 0.3 * Math.sin(frameCount / 10);
  s.color = (frameCount % 60 < 30) ? 'cyan' : 'magenta';
}

function draw() {
  background('#111');
}
