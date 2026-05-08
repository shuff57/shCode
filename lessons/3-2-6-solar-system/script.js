// 3.2.6 Project — Solar System
// Pre-filled: variable declarations. Complete STEPs 1–7 below.
let sun, earth, moon, myPlanet;

function setup() {
  background('#000');

  // STEP 1: Create sun = new Sphere(0, 0, 0, 1.2) and set its color to 'yellow'.

  // STEP 2: Create earth = new Sphere(4, 0, 0, 0.6) and set its color to 'dodgerblue'.

  // STEP 3: Create moon = new Sphere(5.2, 0, 0, 0.3) and set its color to 'lightgray'.

  // STEP 7 (setup part): Create myPlanet — a 4th body of your choice.
  //   Give it a unique color, radius, and starting position.
  //   Document it with a comment: // my planet: <description>

}

function draw() {
  background('#000');

  // STEP 4: Orbit earth around the sun:
  //   earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4
  //   earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4

  // STEP 5: Orbit moon around earth (anchor offset pattern):
  //   moon.position.x = earth.position.x + Math.cos(radians(frameCount * 2)) * 1.2
  //   moon.position.z = earth.position.z + Math.sin(radians(frameCount * 2)) * 1.2

  // STEP 6: Spin the sun: sun.rotation.y += 0.005

  // STEP 7 (draw part): Orbit myPlanet around the sun with its own speed and radius.

}
