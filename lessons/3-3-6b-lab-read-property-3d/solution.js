// 3.3.6b Lab — Read a 3D property — solution

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
}

let p;

function setup() {
  p = new Planet(0, 0, 0, 1);
  p.shape.color = 'gold';
}

function draw() {
  background('#000');
  p.shape.rotation.y += 0.01;
  console.log(p.shape.position.x);
}
