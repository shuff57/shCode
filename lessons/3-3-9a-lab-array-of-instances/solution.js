// 3.3.9a Lab — Array of 3 instances — solution

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
  planets.push(new Planet(-3, 0, 0, 0.6));
  planets[0].shape.color = 'deepskyblue';

  planets.push(new Planet(0, 0, 0, 0.9));
  planets[1].shape.color = 'gold';

  planets.push(new Planet(3, 0, 0, 0.5));
  planets[2].shape.color = 'tomato';
}

function draw() {
  background('#000');
  for (let p of planets) p.update();
}
