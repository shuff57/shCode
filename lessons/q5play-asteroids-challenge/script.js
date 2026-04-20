/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.3.3 Asteroid Field — Challenge
// Left/Right to rotate, Up to thrust, Space to shoot.

let ship, asteroids, bullets;
let gameOver = false;

function setup() {
  new Canvas(500, 500);
  world.gravity.y = 0;

  ship = new Sprite(250, 250, 20, 20);
  ship.color = 'white';

  // TODO: asteroids = new Group(); spawn ~5 asteroids
  // TODO: bullets = new Group();
}

function update() {
  if (gameOver) return;

  // TODO: rotate with left/right
  // TODO: thrust with up key — use Math.cos(ship.rotation), Math.sin(ship.rotation)
  // TODO: shoot with kb.presses(' ')

  // TODO: overlap: bullet-asteroid → both .remove()
  // TODO: overlap: ship-asteroid → gameOver = true

  // TODO: wrap asteroids around screen edges
}

function draw() {
  background('#000');
  if (gameOver) {
    fill('red');
    textSize(40);
    text('GAME OVER', 130, 260);
  }
}
