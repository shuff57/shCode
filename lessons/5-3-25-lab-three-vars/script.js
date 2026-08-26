// 2.2.8a Lab: Three Enemies in three variables.

class Enemy {
  constructor(x, y, hp) {
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
  }

  render() {
    this.sprite.text = String(this.hp);
  }
}

let e1, e2, e3;

function setup() {
  new Canvas(400, 200);

  // STEP 1: Create e1, e2, and e3: one Enemy at each of three different positions.
  //   new Enemy(x, y, hp) takes an x position, y position, and hit point value.
  //   Each call produces a completely separate object with its own hp and sprite.
}

function draw() {
  background('#222');
  if (e1) e1.render();
  if (e2) e2.render();
  if (e3) e3.render();
}
