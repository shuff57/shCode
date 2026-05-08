// 3.3.8c Lab — Method that returns data — solution

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }

  update() {
    this.shape.rotation.y += 0.02;
    this.shape.position.y += 0.005;
  }

  isAbove(threshold) {
    return this.shape.position.y > threshold;
  }
}

let p;

function setup() {
  p = new Planet(0, -2, 0, 0.8);
  p.shape.color = 'limegreen';
}

function draw() {
  background('#000');
  p.update();
  if (p.isAbove(0)) {
    p.shape.color = 'gold';
  }
}
