// 2.2.4b Lab — Read a property.

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

  // STEP 1: Print b.color and b.size to the on-canvas console.
  //   Use console.log once for each property so you can see their values.
}
