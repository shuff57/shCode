// 2.2.7e Lab — A method calling this.otherMethod().

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

  // STEP 1: Write bigStep() that calls this.addBy(5) and then returns this.isHigh().
  //   Both calls use "this." because they operate on the same instance.
  //   Return the result of isHigh() so the driver can read it.
}

let c;

function setup() {
  new Canvas(260, 190);
  c = new Counter();
}

function draw() {
  background('#222');
  fill(c.isHigh() ? 'red' : 'white');
  textSize(32);
  textAlign(CENTER);
  text(c.n, 130, 90);
  textSize(12);
  textAlign(LEFT);
  fill('gray');
  text('Space = tick   B = bigStep (+5)', 20, 165);
  if (kb.presses('space')) c.tick();
  if (kb.presses('b')) c.bigStep();
}
