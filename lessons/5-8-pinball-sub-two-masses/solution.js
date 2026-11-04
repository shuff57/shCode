// 5.8.2 Sub-build: Two balls, two masses (reference solution).
let heavy, light;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;

  heavy = new Sprite(120, 150, 30);
  heavy.color = 'sienna';

  light = new Sprite(120, 230, 30);
  light.color = 'deepskyblue';

  heavy.mass = 4;
  light.mass = 0.5;
}

function draw() {
  background('white');
  textSize(16);
  text('Press P to push both', 12, 24);

  if (kb.presses('p')) {
    heavy.applyForce(6, 0);
    light.applyForce(6, 0);
  }
}
