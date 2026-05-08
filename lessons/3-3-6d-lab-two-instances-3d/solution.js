// 3.3.6d Lab — Two 3D instances — solution

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
  p1 = new Planet(-2, 0, 0, 0.7);
  p1.setColor('deepskyblue');

  p2 = new Planet(2, 0, 0, 0.5);
  p2.setColor('tomato');
}

function draw() {
  background('#000');
  p1.shape.rotation.y += 0.01;
  p2.shape.rotation.y += 0.015;
}
