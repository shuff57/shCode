// 3.3.8d Lab — Method calling this.method — solution

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

  spin() {
    this.shape.rotation.y += 0.05;
    this.recolor();
  }
}

let p;

function setup() {
  p = new Planet(0, 0, 0, 1);
  p.shape.color = 'deepskyblue';
}

function draw() {
  background('#000');
  p.spin();
}
