// 3.3.6a Lab — Build a Planet class

let p;

function setup() {
  // STEP 1: Declare a class named Planet.
  //   Its constructor should take (x, y, z, radius)
  //   and store this.shape = new Sphere(x, y, z, radius).

  // STEP 2: Create an instance: p = new Planet(0, 0, 0, 1)

  // STEP 3: Set p.shape.color to any CSS color.
}

function draw() {
  background('#000');
  if (p) p.shape.rotation.y += 0.01;
}
