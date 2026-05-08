// 3.3.6c Lab — Write a 3D property via method — solution

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }

  setColor(c) {
    this.shape.color = c;
  }
}

let p;

function setup() {
  p = new Planet(0, 0, 0, 1);
  p.setColor('tomato');
}

function draw() {
  background('#000');
  p.shape.rotation.y += 0.01;
}
