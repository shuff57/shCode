// 5.5.3 Lab: Move the counter onto this (reference solution).

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
  new Canvas(220, 170);
  c = new Counter();
}

function draw() {
  background('#222');
  fill('white');
  textSize(32);
  textAlign(CENTER);
  text('count: ' + c.n, 110, 80);
  textSize(12);
  textAlign(LEFT);
  text('press Space', 20, 145);
  if (kb.presses('space')) c.tick();
}
