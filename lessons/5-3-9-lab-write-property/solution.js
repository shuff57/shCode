// 2.2.4c Lab: Write a property (reference solution).

class Box {
  constructor() {
    this.color = 'red';
    this.size = 40;
  }
}

let b;
const colors = ['red', 'lime', 'deepskyblue', 'orange', 'magenta'];
let i = 0;

function setup() {
  new Canvas(200, 200);
  b = new Box();
}

function draw() {
  background('#222');
  fill(b.color);
  square(80, 80, b.size);

  if (kb.presses('space')) {
    i = (i + 1) % colors.length;
    b.color = colors[i];
  }
}
