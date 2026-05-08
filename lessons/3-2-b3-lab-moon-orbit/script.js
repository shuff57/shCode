// 3.2.B3 Build-Up — Moon Orbits Earth
// Starter includes B1+B2's solution. Add only what B3 asks for.
let sun, earth, moon;

function setup() {
  background('#000');
  sun = new Sphere(0, 0, 0, 1.2);
  sun.color = 'yellow';

  earth = new Sphere(4, 0, 0, 0.6);
  earth.color = 'dodgerblue';

  // STEP 1: Create moon = new Sphere(5.2, 0, 0, 0.3) and set its color to 'lightgray'.

}

function draw() {
  background('#000');
  earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4;
  earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4;

  // STEP 2: Set moon.position.x = earth.position.x + Math.cos(radians(frameCount * 2)) * 1.2
  // STEP 3: Set moon.position.z = earth.position.z + Math.sin(radians(frameCount * 2)) * 1.2

}
