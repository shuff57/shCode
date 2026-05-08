// 3.3.10 Example — Enemy3D class
// Each Enemy3D wraps one Cone and advances toward the camera each frame.
// Five enemies stored in an array; draw() loops and calls update() on each.
// Modify the code freely — click Refresh to reset.

class Enemy3D {
  constructor(x, y, z) {
    this.shape = new Cone(x, y, z, 0.4, 1);
    this.shape.color = 'crimson';
    this.speed = 0.02 + random(0, 0.02);
  }

  update() {
    this.shape.position.z += this.speed;
    this.shape.rotation.y += 0.05;
    // Wrap around when enemy passes through the camera
    if (this.shape.position.z > 6) {
      this.shape.position.z = -8;
    }
  }

  remove() {
    this.shape.remove();
  }
}

let enemies = [];

function setup() {
  background('#111');
  for (let i = 0; i < 5; i++) {
    enemies.push(new Enemy3D(random(-4, 4), 0, random(-10, -4)));
  }
}

function draw() {
  background('#111');
  for (let e of enemies) {
    e.update();
  }
}
