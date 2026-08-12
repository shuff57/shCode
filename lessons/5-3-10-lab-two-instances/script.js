// 2.2.4d Lab — Two sprites, two property values.

class Box {
  constructor(c) {
    this.color = c;
    this.size = 40;
  }
}

let b1, b2;

function setup() {
  new Canvas(300, 200);

  // STEP 1: Create b1 = new Box('red') and b2 = new Box('blue').
  //   Each constructor call produces a separate instance with its own color.
}

function draw() {
  background('#222');

  // Render both boxes side by side using their color properties.
  if (b1 && b2) {
    fill(b1.color);
    square(60, 80, b1.size);
    fill(b2.color);
    square(180, 80, b2.size);
  }

  // STEP 2: Press space to assign a new color to b1.color only.
  //   After the press, b2.color should be unchanged.
}
