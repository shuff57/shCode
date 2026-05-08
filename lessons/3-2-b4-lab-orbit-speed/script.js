// 3.2.B4 Build-Up — Tune Orbit Speeds
// Starter includes B1+B2+B3's solution. Add only what B4 asks for.
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

  // STEP 1: Change earth's multiplier from 0.6 to 0.3 (slower orbit around the sun).
  earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4;
  earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4;

  // STEP 2: Change moon's multiplier from 2 to 3 (faster orbit around earth).
  moon.position.x = earth.position.x + Math.cos(radians(frameCount * 2)) * 1.2;
  moon.position.z = earth.position.z + Math.sin(radians(frameCount * 2)) * 1.2;
}
