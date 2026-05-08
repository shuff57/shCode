// 3.3.8d Lab — Method calling this.method

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
    this.hue = 0;
  }

  recolor() {
    const colors = ['deepskyblue', 'tomato', 'gold', 'limegreen', 'hotpink'];
    this.hue = (this.hue + 1) % colors.length;
    this.shape.color = colors[this.hue];
  }

  // STEP 1: Write a spin() method that increments this.shape.rotation.y += 0.05
  //   and then calls this.recolor() on every 30th frame (or simply every call).
  //   Both calls use "this." because they operate on the same instance.
}

let p;

function setup() {
  p = new Planet(0, 0, 0, 1);
  p.shape.color = 'deepskyblue';
}

function draw() {
  background('#000');
  if (p.spin) p.spin();
}
