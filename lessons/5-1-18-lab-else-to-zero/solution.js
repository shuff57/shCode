// 5.1.19 Lab: Delete the else, watch drift (reference solution).
// The starter ships working; the student deletes both else lines, watches
// the drift, restores them, and sets a speed of their own (3 here).

let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a')) player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else player.vel.x = 0;

  if (kb.pressing('w')) player.vel.y = -3;
  else if (kb.pressing('s')) player.vel.y = 3;
  else player.vel.y = 0;
}
