// 5.3.16 Your Turn: Fill in a Constructor (reference solution).

class Message {
  constructor(x, y, words) {
    this.x = x;
    this.y = y;
    this.words = words;
  }
}

let first, second;

function setup() {
  new Canvas(400, 240);

  first = new Message(40, 80, 'hello');
  second = new Message(200, 170, 'goodbye');
}

function draw() {
  background('#222');
  fill('white');
  textSize(24);
  if (first !== undefined) text(first.words, first.x, first.y);
  if (second !== undefined) text(second.words, second.x, second.y);
}
