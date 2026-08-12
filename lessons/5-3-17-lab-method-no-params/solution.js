// 2.2.7b Lab — Method with no params (reference solution).

class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    this.n += 1;
  }
}

let c;

function setup() {
  new Canvas(200, 160);
  c = new Counter();
}

function draw() {
  background('#222');
  fill('white');
  textSize(32);
  textAlign(CENTER);
  text(c.n, 100, 80);
  textSize(12);
  textAlign(LEFT);
  text('press Space to tick', 20, 140);
  if (kb.presses('space')) c.tick();
}
