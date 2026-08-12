// 2.2.4b Lab — Read a property (reference solution).

class Box {
  constructor() {
    this.color = 'red';
    this.size = 40;
  }
}

let b;

function setup() {
  new Canvas(200, 200);
  b = new Box();
}

function draw() {
  background('#222');
  fill(b.color);
  square(80, 80, b.size);

  console.log(b.color);
  console.log(b.size);
}
