// 3.3.6d Lab — Two 3D instances

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
  setColor(c) {
    this.shape.color = c;
  }
}

let p1, p2;

function setup() {
  // STEP 1: Create p1 = new Planet(-2, 0, 0, 0.7) and give it a color.
  // STEP 2: Create p2 = new Planet(2, 0, 0, 0.5) and give it a different color.
}

function draw() {
  background('#000');
  if (p1) p1.shape.rotation.y += 0.01;
  if (p2) p2.shape.rotation.y += 0.015;
}
