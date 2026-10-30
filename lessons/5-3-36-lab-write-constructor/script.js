// 5.6.16 Your Turn: Fill in a Constructor.

class Message {
  constructor(x, y, words) {
    // STEP 1: store the x argument on this instance as a property named x.

    // STEP 2: store the y argument as a property named y.

    // STEP 3: store the words argument as a property named words.
  }
}

let first, second;

function setup() {
  new Canvas(400, 240);

  // STEP 4: build two Message instances with different values, and
  // store them in first and second.
}

function draw() {
  background('#222');
  fill('white');
  textSize(24);
  if (first !== undefined) text(first.words, first.x, first.y);
  if (second !== undefined) text(second.words, second.x, second.y);
}
