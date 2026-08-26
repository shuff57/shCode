// 2.2.8b Lab: An array of Enemies.

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

  // STEP 1: Push five new Enemy instances into the enemies array.
  //   Call enemies.push(new Enemy(x, y, hp)) five times with different x values
  //   so the enemies appear spread across the canvas.
}

function draw() {
  background('#222');
  for (let e of enemies) e.render();
}
