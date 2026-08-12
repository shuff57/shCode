// 2.2.8c Lab — Loop over an array of instances.

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

  // STEP 1: Loop over the enemies array and call .render() on each element.
  //   Use a for...of loop: for (let e of enemies) { ... }
  //   Inside the loop body, call the render method on the loop variable.
}
