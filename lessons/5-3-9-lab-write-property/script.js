// 2.2.4c Lab: Write a property.

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

  // STEP 1: When the user presses the space bar, assign a new color to b.color.
  //   Use kb.presses to detect the press and dot notation to write the property.
}
