/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.2.1 Bouncy Ball — play with bounciness and friction.

let ball;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  // Four walls — top, bottom, left, right
  new Sprite(200, 10, 400, 20, 'static').color = '#444';
  new Sprite(200, 390, 400, 20, 'static').color = '#444';
  new Sprite(10, 200, 20, 400, 'static').color = '#444';
  new Sprite(390, 200, 20, 400, 'static').color = '#444';

  ball = new Sprite(200, 100, 30);
  ball.color = 'orange';
  ball.bounciness = 0.9;
  ball.friction = 0;

  ball.vel.x = 4;
}

function draw() {
  background('#111');
}
