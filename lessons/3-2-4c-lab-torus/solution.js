// 3.2.4c Lab — Add a Torus — solution
let ring;

function setup() {
  ring = new Torus(0, 0, 0, 1.5, 0.3);
  ring.color = 'gold';
}

function draw() {
  background('#111');
}
