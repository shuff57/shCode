// 3.3.9a Lab — Array of 3 instances

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
  update() {
    this.shape.rotation.y += 0.01;
  }
}

let planets = [];

function setup() {
  // STEP 1: Push three Planet instances into the planets array.
  //   Use different x values so they appear spread apart.
  //   Example: planets.push(new Planet(-3, 0, 0, 0.6))
}

function draw() {
  background('#000');
  for (let p of planets) p.update();
}
