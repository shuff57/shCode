// 5.7.3 Sub-build: A word that floats and dies (reference solution).
function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('white');
  if (mouse.presses()) {
    const pop = new Sprite(mouse.x, mouse.y, 28);
    pop.collider = 'none';
    pop.color = 'gold';
    pop.text = '+5';
    pop.vel.y = -1;
    pop.life = 40;
  }
}
