// 5.2.1 Bouncy Ball (reference solution).
//
// A closed box with one ball loose inside it. Every wall is static, so the
// physics engine never moves them -- the ball is the only thing with a say.

let ball;

function setup() {
  new Canvas(400, 400);

  // STEP 1 — gravity pulls DOWN the screen, and y grows downward, so this
  // is positive rather than negative.
  world.gravity.y = 10;

  // STEP 2 — four static walls. 'static' means immovable: the ball bounces
  // off them and they do not budge or fall.
  let top = new Sprite(200, 10, 400, 20, 'static');
  let bottom = new Sprite(200, 390, 400, 20, 'static');
  let leftWall = new Sprite(10, 200, 20, 400, 'static');
  let rightWall = new Sprite(390, 200, 20, 400, 'static');
  top.color = '#445';
  bottom.color = '#445';
  leftWall.color = '#445';
  rightWall.color = '#445';

  // STEP 3 — ONE size argument instead of two makes a circle, not a square.
  ball = new Sprite(200, 120, 40);
  ball.color = 'deepskyblue';

  // STEP 4 — 0 is a beanbag, 1 gives back every bit of energy it arrived
  // with. Near the top of the range, but under 1, so it settles eventually.
  ball.bounciness = 0.9;

  // STEP 5 — friction is drag ALONG a surface. Near zero keeps it rolling
  // instead of scrubbing to a halt on the floor.
  ball.friction = 0.02;

  // STEP 6 — a sideways kick, so it travels the box instead of dropping
  // straight down and bouncing in place.
  ball.vel.x = 6;
}

function draw() {
  // STEP 7 — repaint every frame, or each one is drawn on top of the last
  // and the ball smears into a streak.
  background('#111');
}
