/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.5.3 Two-Player Pong-Sumo — Challenge
// P1: W/S     P2: Up/Down     First to 5 wins.

let p1, p2, ball;
let p1Score = 0, p2Score = 0;

function setup() {
  new Canvas(600, 400);
  world.gravity.y = 0;

  // Top and bottom walls
  new Sprite(300, 8, 600, 16, 'static').color = '#444';
  new Sprite(300, 392, 600, 16, 'static').color = '#444';

  p1 = new Sprite(40, 200, 20, 80, 'kinematic');
  p1.color = 'tomato';

  p2 = new Sprite(560, 200, 20, 80, 'kinematic');
  p2.color = 'deepskyblue';

  ball = new Sprite(300, 200, 18);
  ball.color = 'white';
  ball.bounciness = 1;
  ball.friction = 0;
  ball.vel.x = 5;
  ball.vel.y = 3;
}

function update() {
  // TODO: P1 moves with 'w'/'s', P2 with 'up'/'down'

  // TODO: if (ball.x < 0) → p2Score++ and reset ball
  // TODO: if (ball.x > 600) → p1Score++ and reset ball
}

function draw() {
  background('#112');
  fill('white');
  textSize(28);
  text(p1Score, 220, 40);
  text(p2Score, 360, 40);

  if (p1Score >= 5) { textSize(40); text('Red wins!', 180, 220); }
  else if (p2Score >= 5) { textSize(40); text('Blue wins!', 170, 220); }
}
