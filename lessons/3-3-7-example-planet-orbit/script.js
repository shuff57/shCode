// 3.3.7 Example — Planet Orbit Class
// A Planet class with an orbit() method that drives circular motion.
// Two instances orbit at different radii and speeds.
// Modify the code freely — click Refresh to reset.

class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }

  orbit(centerX, centerZ, distance, speed) {
    this.shape.position.x = centerX + Math.cos(radians(frameCount * speed)) * distance;
    this.shape.position.z = centerZ + Math.sin(radians(frameCount * speed)) * distance;
    this.shape.rotation.y += 0.02;
  }
}

let sun, earth, mars;

function setup() {
  background('#000');

  // Sun at the center
  sun = new Sphere(0, 0, 0, 1.2);
  sun.color = 'gold';

  // Earth orbits at distance 3
  earth = new Planet(3, 0, 0, 0.5);
  earth.shape.color = 'deepskyblue';

  // Mars orbits at distance 5
  mars = new Planet(5, 0, 0, 0.35);
  mars.shape.color = 'tomato';
}

function draw() {
  background('#000');
  sun.rotation.y += 0.005;
  earth.orbit(0, 0, 3, 0.8);
  mars.orbit(0, 0, 5, 0.5);
}
