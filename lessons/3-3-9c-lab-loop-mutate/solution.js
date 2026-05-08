// 3.3.9c Lab — Loop: mutate a property — solution

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
  update() {
    this.shape.rotation.y += 0.01;
  }
}

let planets = [
  new Planet(-3, 0, 0, 0.6),
  new Planet( 0, 0, 0, 0.9),
  new Planet( 3, 0, 0, 0.5),
];

function setup() {
  const colors = ['deepskyblue', 'gold', 'tomato'];
  for (let i = 0; i < planets.length; i++) {
    planets[i].shape.color = colors[i];
  }
}

function draw() {
  background('#000');
  for (let p of planets) p.update();
}
