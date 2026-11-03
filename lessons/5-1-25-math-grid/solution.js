// 5.1.26 Lab: A grid like math (optional) (reference solution).
// Math mode: (0, 0) at the centre, y grows up.

let box;

function setup() {
  new Canvas(400, 400);
  world.origin = 'math';

  box = new Sprite(100, 50, 40, 40);
  box.color = 'deepskyblue';
}

function draw() {
  background('#222');
  showGrid(50);
  showMouse();
}
