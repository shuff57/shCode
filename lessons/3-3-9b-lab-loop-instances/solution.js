// 3.3.9b Lab — Loop: call update() on each — solution

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
  update() {
    this.shape.rotation.y += 0.015;
  }
}

let planets = [
  new Planet(-3, 0, 0, 0.6),
  new Planet( 0, 0, 0, 0.9),
  new Planet( 3, 0, 0, 0.5),
];

function setup() {
  planets[0].shape.color = 'deepskyblue';
  planets[1].shape.color = 'gold';
  planets[2].shape.color = 'tomato';
}

function draw() {
  background('#000');
  for (let p of planets) {
    p.update();
  }
}
