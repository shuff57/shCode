// 3.2.B2 Build-Up — Earth Orbits — solution
let sun, earth;

function setup() {
  background('#000');
  sun = new Sphere(0, 0, 0, 1.2);
  sun.color = 'yellow';

  earth = new Sphere(4, 0, 0, 0.6);
  earth.color = 'dodgerblue';
}

function draw() {
  background('#000');
  earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4;
  earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4;
}
