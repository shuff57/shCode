/// <reference path="/q5play/docs/q5play.d.ts" />

// 5.4.3 Side-Scrolling Platformer — Challenge
// Build a level, follow the player, win by touching the flag.

let player, ground, flag;
let won = false;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  ground = new Sprite(1000, 390, 2000, 20, 'static');
  ground.color = '#554433';

  // TODO: add 6 static platforms at varied heights across the level

  player = new Sprite(60, 300, 30, 40);
  player.color = 'deepskyblue';

  // TODO: create a flag sprite at roughly x=1900, static
  // flag = new Sprite(1900, 330, 20, 80, 'static');
  // flag.color = 'gold';
}

function update() {
  if (won) return;

  // TODO: left/right movement

  // TODO: jump only when player.colliding(ground or a platform)

  // TODO: if player.overlapping(flag) → won = true

  camera.x = player.x; // or lerp
}

function draw() {
  background('#224466');
  if (won) {
    fill('yellow');
    textSize(40);
    text('You Win!', player.x - 90, player.y - 60);
  }
}
