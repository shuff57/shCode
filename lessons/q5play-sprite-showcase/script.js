// 5.1.1 Sprite Showcase — six sprites, three shapes, lots of color.

function setup() {
  new Canvas(400, 400);

  // Rectangle: new Sprite(x, y, width, height)
  const box = new Sprite(80, 80, 80, 60);
  box.color = 'deepskyblue';

  // Square: width and height the same
  const square = new Sprite(200, 80, 60, 60);
  square.color = 'tomato';

  // Tall rectangle
  const tower = new Sprite(320, 80, 40, 100);
  tower.color = '#a78bfa';

  // Circle: new Sprite(x, y, diameter) — one size argument
  const ball = new Sprite(80, 260, 70);
  ball.color = 'gold';

  // Smaller circle with a semi-transparent color
  const dot = new Sprite(200, 260, 40);
  dot.color = 'rgba(16, 185, 129, 0.6)';

  // Large circle with a stroke
  const planet = new Sprite(320, 260, 90);
  planet.color = '#222';
  planet.stroke = 'deepskyblue';
  planet.strokeWeight = 4;
}

function draw() {
  background('#111');
}
