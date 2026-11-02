// 5.8.3 Lab: Move the counter onto this.

class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    // STEP 1: this method changes a LOCAL, so the number on screen never
    //   moves. Make the change land on this.n instead.
    let n = 0;
    n += 1;
    this.n = n;
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
