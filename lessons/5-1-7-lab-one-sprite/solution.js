// 2.1.3c Lab: Drop one sprite, change its color (reference solution).

let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 50, 50);
  player.color = 'tomato';
}

function draw() {
  background('#222');
}
