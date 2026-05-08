// 3.2.B5 Build-Up — Sun Rotates
// Starter includes B1+B2+B3+B4's solution. Add only what B5 asks for.
let sun, earth, moon;

function setup() {
  background('#000');
  sun = new Sphere(0, 0, 0, 1.2);
  sun.color = 'yellow';

  earth = new Sphere(4, 0, 0, 0.6);
  earth.color = 'dodgerblue';

  moon = new Sphere(5.2, 0, 0, 0.3);
  moon.color = 'lightgray';
}

function draw() {
  background('#000');
  earth.position.x = Math.cos(radians(frameCount * 0.3)) * 4;
  earth.position.z = Math.sin(radians(frameCount * 0.3)) * 4;
  moon.position.x = earth.position.x + Math.cos(radians(frameCount * 3)) * 1.2;
  moon.position.z = earth.position.z + Math.sin(radians(frameCount * 3)) * 1.2;

  // STEP 1: Add sun.rotation.y += 0.005 so the sun slowly spins on its axis.

}
