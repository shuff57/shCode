// Sub-build: an object that draws itself. A Bar class keeps a value and its
// maximum, and its draw method shows how full it is. Two bars, made from one class.

class Bar {
  constructor(max, color) {
    this.max = max;
    this.value = max;
    this.color = color;
  }

  draw(x, y) {
    fill('#333');
    rect(x, y, 200, 16);
    fill(this.color);
    rect(x, y, 200 * this.value / this.max, 16);
    text(this.value + '/' + this.max, x + 210, y + 13, 14, 'white');
  }
}

let health;
let magic;

function setup() {
  new Canvas(400, 140);
  health = new Bar(30, 'limegreen');
  magic = new Bar(10, 'dodgerblue');
  magic.value = 4;
}

function draw() {
  background('#1b1d2a');
  health.draw(20, 40);
  magic.draw(20, 80);
}
