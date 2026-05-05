// 2.2.8a Lab — Three Enemies in three variables (reference solution).

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
  e1 = new Enemy(80,  100, 5);
  e2 = new Enemy(200, 100, 3);
  e3 = new Enemy(320, 100, 8);
}

function draw() {
  background('#222');
  if (e1) e1.render();
  if (e2) e2.render();
  if (e3) e3.render();
}
