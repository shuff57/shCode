// 3.3.9c Lab — Loop: mutate a property

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
  // STEP 1: Loop over the planets array and set each planet's .shape.color.
  //   Use a color array like ['deepskyblue', 'gold', 'tomato'] to give each
  //   planet a different color.
}

function draw() {
  background('#000');
  for (let p of planets) p.update();
}
