// 5.8.4 Debugging: The heavy ball that flies (starter, with both bugs).
let heavy, light;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;
  heavy = new Sprite(120, 150, 30); heavy.color = 'sienna';
  light = new Sprite(120, 230, 30); light.color = 'deepskyblue';

  // BUG 1: the masses are the wrong way round.
  heavy.mass = 0.5;
  light.mass = 4;
}

function draw() {
  background('white');
  if (kb.presses('p')) {
    // BUG 2: the light ball is never pushed.
    heavy.applyForce(6, 0);
    heavy.applyForce(6, 0);
  }
}
