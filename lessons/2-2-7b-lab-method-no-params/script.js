// 2.2.7b Lab — Method with no params.

class Counter {
  constructor() {
    this.n = 0;
  }

  // STEP 1: Write a tick() method that adds 1 to this.n.
  //   A method takes no arguments here — just the name, empty parens, and a body.
  //   Use this.n inside the body to refer to the instance's count.
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
