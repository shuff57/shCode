// 3.3.12a Sandbox — OOP Playground
// A pre-built Enemy3D class with update(). Three instances in an array.
//
// Try adding a wobble() method to Enemy3D that uses
//   Math.sin(frameCount * 0.05) on this.shape.position.x
// Then call wobble() inside your update() loop below.
//
// Modify the code freely — click Refresh to reset.

class Enemy3D {
  constructor(x, y, z) {
    this.shape = new Cone(x, y, z, 0.4, 1);
    this.shape.color = 'crimson';
    this.speed = 0.02;
    this.baseX = x;   // remember starting x for wobble math
  }

  update() {
    this.shape.rotation.y += 0.05;
    this.shape.position.z += this.speed;
    if (this.shape.position.z > 6) this.shape.position.z = -8;
  }

  // Try adding a wobble() method here!
  // wobble() {
  //   this.shape.position.x = this.baseX + Math.sin(frameCount * 0.05) * 0.5;
  // }
}

let enemies = [];

function setup() {
  background('#111');
  enemies.push(new Enemy3D(-3, 0, -6));
  enemies.push(new Enemy3D( 0, 0, -4));
  enemies.push(new Enemy3D( 3, 0, -8));
}

function draw() {
  background('#111');
  for (let e of enemies) {
    e.update();
    // Once you add wobble(), call e.wobble() here too.
  }
}
