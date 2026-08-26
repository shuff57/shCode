// 2.2.7d Lab: Method that returns a value (reference solution).

class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    this.n += 1;
  }

  addBy(n) {
    this.n += n;
  }

  isHigh() {
    return this.n > 10;
  }
}

let c;

function setup() {
  new Canvas(240, 180);
  c = new Counter();
}

function draw() {
  background('#222');
  fill(c.isHigh() ? 'red': 'white');
  textSize(32);
  textAlign(CENTER);
  text(c.n, 120, 90);
  textSize(12);
  textAlign(LEFT);
  fill('gray');
  text('1/2/3 = addBy   Space = tick', 20, 160);
  if (kb.presses('space')) c.tick();
  if (kb.presses('1')) c.addBy(1);
  if (kb.presses('2')) c.addBy(2);
  if (kb.presses('3')) c.addBy(3);
}
