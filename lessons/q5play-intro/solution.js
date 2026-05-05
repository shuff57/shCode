// 2.1.5 Hello Sprite (reference solution).
// First q5play sketch — canvas, sprite, color, background.

let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}
