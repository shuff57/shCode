// 2.2.7g Lab: Mutate this.sprite.x from a method (reference solution).

class Mover {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'deepskyblue';
  }

  moveRight(dx) {
    this.sprite.x += dx;
  }
}

let m;

function setup() {
  new Canvas(400, 200);
  m = new Mover(50, 100);
}

function draw() {
  background('#222');
  if (kb.pressing('right')) m.moveRight(2);
}
