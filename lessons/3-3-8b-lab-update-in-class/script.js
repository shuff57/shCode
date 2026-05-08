// 3.3.8b Lab — update() inside a class

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }

  // STEP 1: Add an update() method that increments this.shape.rotation.y += 0.02.
}

let p;

function setup() {
  p = new Planet(0, 0, 0, 1);
  p.shape.color = 'deepskyblue';
}

function draw() {
  background('#000');
  // STEP 2: Call p.update() here so the planet spins every frame.
}
