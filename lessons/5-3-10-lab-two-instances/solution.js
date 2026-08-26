// 2.2.4d Lab: Two sprites, two property values (reference solution).

class Box {
  constructor(c) {
    this.color = c;
    this.size = 40;
  }
}

let b1, b2;
const colors = ['red', 'lime', 'orange', 'magenta', 'yellow'];
let i = 0;

function setup() {
  new Canvas(300, 200);
  b1 = new Box('red');
  b2 = new Box('blue');
}

function draw() {
  background('#222');
  fill(b1.color);
  square(60, 80, b1.size);
  fill(b2.color);
  square(180, 80, b2.size);

  if (kb.presses('space')) {
    i = (i + 1) % colors.length;
    b1.color = colors[i];
  }
}
