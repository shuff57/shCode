// 7.16.3 Sub-build: An object that draws itself.
// A Bar keeps a value and its maximum, and its draw method will show how full
// it is. Two bars, made from one class.

class Bar {
  constructor(max, color) {
    this.max = max;
    this.value = max;
    this.color = color;
  }

  // STEP: draw(x, y): a grey bar 200 wide and 16 high at (x, y), then, on top of it,
  // a bar in this bar's own colour that is 200 * this.value / this.max wide.
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
  // STEP: each bar draws itself: health at (20, 40) and magic at (20, 80).
}
