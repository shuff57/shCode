/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.1.3 Space Jumper — Challenge
// Left/Right to move, Space to jump — only when touching the ground.

let player, ground;

function setup() {
  new Canvas(400, 400);
  // TODO: set world.gravity.y

  // TODO: create the player (dynamic) and ground (static)
}

function update() {
  // TODO: horizontal movement with kb.pressing('left') / kb.pressing('right')

  // TODO: jump with kb.presses(' ') AND player.colliding(ground)
  //   → player.vel.y = -8
}

function draw() {
  // TODO: background(...)
}
