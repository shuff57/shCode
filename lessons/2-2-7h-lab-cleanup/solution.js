// 2.2.7h Lab — Cleanup with this.sprite.delete() (reference solution).

class Bubble {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 20);
    this.sprite.color = 'lightblue';
  }

  pop() {
    this.sprite.delete();
  }
}

let b;

function setup() {
  new Canvas(300, 300);
  b = new Bubble(150, 150);
}

function draw() {
  background('#222');
  if (mouse.presses()) b.pop();
}
