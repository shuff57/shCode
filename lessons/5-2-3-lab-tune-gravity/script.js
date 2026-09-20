// 5.2.3 Lab: Tune Gravity: try several values and see how each one feels.

let player, ground, goal;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';

  goal = new Sprite(360, 340, 24, 24);
  goal.color = 'gold';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;
}

// Try it: change world.gravity.y above to 10, then 0, then -5, then 20.
// After each change, hit Run and watch what the player does. In your own
// words, note what each value feels like: does the player fall, float, or
// drift upward? How fast? There's no single "right" value here.
