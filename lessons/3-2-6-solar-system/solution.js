// 3.2.6 Project — Solar System — solution
let sun, earth, moon, myPlanet;

function setup() {
  background('#000');

  sun = new Sphere(0, 0, 0, 1.2);
  sun.color = 'yellow';

  earth = new Sphere(4, 0, 0, 0.6);
  earth.color = 'dodgerblue';

  moon = new Sphere(5.2, 0, 0, 0.3);
  moon.color = 'lightgray';

  // my planet: Mars — a small red planet with a wider, slower orbit
  myPlanet = new Sphere(7, 0, 0, 0.45);
  myPlanet.color = 'tomato';
}

function draw() {
  background('#000');

  sun.rotation.y += 0.005;

  earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4;
  earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4;

  moon.position.x = earth.position.x + Math.cos(radians(frameCount * 2)) * 1.2;
  moon.position.z = earth.position.z + Math.sin(radians(frameCount * 2)) * 1.2;

  myPlanet.position.x = Math.cos(radians(frameCount * 0.4)) * 7;
  myPlanet.position.z = Math.sin(radians(frameCount * 0.4)) * 7;
}
