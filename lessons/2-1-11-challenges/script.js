// 2.1.11 Challenges — pick one (or more) from content.md and build it here.
//
// The auto-grader wants:
//   1. A canvas
//   2. At least one sprite
//   3. background() inside draw()
//   4. At least one of: kb.presses, sin/cos, mouse.x/y, lerp, frameCount %, or text()
//
// Open the Challenges content page (2.1.11) for the full list + hints.

let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  // Basic movement — replace or extend with your challenge solution
  if (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else player.vel.x = 0;

  if (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y = 4;
  else player.vel.y = 0;

  // TODO: Implement your chosen challenge below.
  // Examples to get you started:
  //
  //   // Color-changing on space press:
  //   if (kb.presses('space')) player.color = random(['red', 'green', 'blue']);
  //
  //   // Orbiting companion:
  //   // let companion = new Sprite(...) in setup(); then in draw():
  //   // companion.pos.x = player.pos.x + cos(frameCount * 0.05) * 60;
  //
  //   // HUD:
  //   // textSize(14); fill(255);
  //   // text(`Frame: ${frameCount}`, 10, 20);
}
