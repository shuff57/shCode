// 2.4.5 Animated Sprites Sandbox (reference solution).
// Same pattern as addAni / changeAni, but with sprite.image swapping so the
// sandbox doesn't need image asset hosting.

let player;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(200, 220, 30, 30);
  player.color = 'deepskyblue';
  player.image = '🧍';
}

function draw() {
  background('#222');

  let movingX = false;
  if (kb.pressing('a')) { player.vel.x = -3; movingX = true; }
  else if (kb.pressing('d')) { player.vel.x = 3; movingX = true; }
  else player.vel.x = 0;

  // Visual swap driven by input.
  if (kb.pressing('w')) {
    player.image = '🤸';
  } else if (movingX) {
    player.image = '🏃';
  } else {
    player.image = '🧍';
  }
}
