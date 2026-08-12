// 2.2.7h Lab — Cleanup with this.sprite.delete().

class Bubble {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 20);
    this.sprite.color = 'lightblue';
  }

  // STEP 1: Write pop() that calls this.sprite.delete().
  //   The object is responsible for cleaning up the shPlay sprite it owns.
  //   Once deleted, the sprite disappears from the canvas immediately.
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
