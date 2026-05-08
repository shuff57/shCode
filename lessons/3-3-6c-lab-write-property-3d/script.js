// 3.3.6c Lab — Write a 3D property via method

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }

  // STEP 1: Add a setColor(c) method that sets this.shape.color = c.
}

let p;

function setup() {
  p = new Planet(0, 0, 0, 1);

  // STEP 2: Call p.setColor('tomato') (or any CSS color).
}

function draw() {
  background('#000');
  p.shape.rotation.y += 0.01;
}
