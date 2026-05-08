// 3.2.7 Challenges — Solar System Extensions — combined reference solution
// Shows all three challenges integrated.

let sun, earth, moon, myPlanet;
let saturnRing;
let asteroids = [];
let mars;

function setup() {
  background('#000');

  sun = new Sphere(0, 0, 0, 1.2);
  sun.color = 'yellow';

  earth = new Sphere(4, 0, 0, 0.6);
  earth.color = 'dodgerblue';

  moon = new Sphere(5.2, 0, 0, 0.3);
  moon.color = 'lightgray';

  // my planet: Jupiter — large orange gas giant at wide orbit
  myPlanet = new Sphere(9, 0, 0, 0.9);
  myPlanet.color = '#c8864a';

  // Challenge 1: Saturn ring around myPlanet
  saturnRing = new Torus(9, 0, 0, 1.4, 0.08);
  saturnRing.color = '#d4b483';
  saturnRing.rotation.x = radians(90);

  // Challenge 2: Asteroid belt (10 asteroids between earth and myPlanet)
  for (let i = 0; i < 10; i++) {
    let asteroid = new Sphere(random(5.5, 8), 0, 0, random(0.05, 0.15));
    asteroid.color = '#888';
    asteroids.push(asteroid);
  }

  // Challenge 3: Mars — second planet with different orbit
  mars = new Sphere(7, 0, 0, 0.45);
  mars.color = 'tomato';
}

function draw() {
  background('#000');

  sun.rotation.y += 0.005;

  earth.position.x = Math.cos(radians(frameCount * 0.6)) * 4;
  earth.position.z = Math.sin(radians(frameCount * 0.6)) * 4;

  moon.position.x = earth.position.x + Math.cos(radians(frameCount * 2)) * 1.2;
  moon.position.z = earth.position.z + Math.sin(radians(frameCount * 2)) * 1.2;

  myPlanet.position.x = Math.cos(radians(frameCount * 0.2)) * 9;
  myPlanet.position.z = Math.sin(radians(frameCount * 0.2)) * 9;

  // Challenge 1: ring follows myPlanet
  saturnRing.position.x = myPlanet.position.x;
  saturnRing.position.z = myPlanet.position.z;

  // Challenge 2: asteroids orbit at their own speeds
  for (let i = 0; i < asteroids.length; i++) {
    let speed = 0.5 + i * 0.1;
    let dist = 5.5 + (i * 0.25);
    asteroids[i].position.x = Math.cos(radians(frameCount * speed)) * dist;
    asteroids[i].position.z = Math.sin(radians(frameCount * speed)) * dist;
  }

  // Challenge 3: Mars orbits at radius 7
  mars.position.x = Math.cos(radians(frameCount * 0.4)) * 7;
  mars.position.z = Math.sin(radians(frameCount * 0.4)) * 7;
}
