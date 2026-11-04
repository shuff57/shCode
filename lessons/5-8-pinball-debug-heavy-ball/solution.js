// 5.8.4 Debugging: The heavy ball that flies (reference solution).
let heavy, light;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;
  heavy = new Sprite(120, 150, 30); heavy.color = 'sienna';
  light = new Sprite(120, 230, 30); light.color = 'deepskyblue';

  heavy.mass = 4;
  light.mass = 0.5;
}

function draw() {
  background('white');
  if (kb.presses('p')) {
    heavy.applyForce(6, 0);
    light.applyForce(6, 0);
  }
}
