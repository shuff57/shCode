// 2.2.8c Lab — Loop over an array of instances (reference solution).

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

let enemies = [];

function setup() {
  new Canvas(400, 200);
  enemies.push(new Enemy(50,  100, 5));
  enemies.push(new Enemy(130, 100, 3));
  enemies.push(new Enemy(210, 100, 8));
  enemies.push(new Enemy(290, 100, 2));
  enemies.push(new Enemy(370, 100, 6));
}

function draw() {
  background('#222');
  for (let e of enemies) {
    e.render();
  }
}
