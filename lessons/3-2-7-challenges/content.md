# Challenges — Solar System Extensions

Start from your completed Solar System (3.2.6). Pick one or more challenges below.

---

## Challenge 1 — Saturn Ring (medium)

Add a Torus around one of your planets so it looks like Saturn's ring system. The Torus should be large enough to wrap visually around the planet and oriented so it lies flat (rotate it 90° on X so it sits like a belt).

**Hints:**
- `new Torus(x, y, z, ringRadius, tubeRadius)` — make `ringRadius` slightly larger than your planet's Sphere radius, and `tubeRadius` thin (e.g. 0.08).
- To make the torus follow the planet, update `torus.position.x = planet.position.x` and `.z` in draw() just like the moon's anchor offset.
- Rotate the torus flat with `torus.rotation.x = radians(90)` once in setup().

**Stretch it further:** Add a second thinner torus ring for a multi-ring Saturn system.

---

## Challenge 2 — Asteroid Belt (medium)

Use `random()` to spawn 10 Sphere "asteroids" at random orbit distances between earth and myPlanet. Give each a unique random speed and size.

**Hints:**
- Create 10 Spheres in a loop in setup(): `let a = new Sphere(random(5,6.5), 0, 0, random(0.05, 0.15))`.
- Store each in an array: `asteroids.push(a)`.
- In draw(), loop through the array and update each asteroid's position with its own frameCount multiplier (store speed per asteroid or use the index).

**Stretch it further:** Give each asteroid a slightly tilted Y orbit so they don't all orbit in the same flat plane.

---

## Challenge 3 — Two-Planet System (easy)

Add a second planet (earth + mars) so the solar system has two orbiting planets with different orbit radii and speeds.

**Hints:**
- Create a second Sphere for Mars: `let mars = new Sphere(7, 0, 0, 0.45)` and set its color to 'tomato'.
- In draw(), give Mars its own orbit math with a different multiplier and radius from Earth's.
- Earth orbits at radius 4; try Mars at radius 7 with a multiplier around 0.4.

**Stretch it further:** Give Mars its own moon using the anchor offset pattern from the moon lesson.

---

## If you finish all three

Combine: a Saturn-ring planet with an asteroid belt scattered around it, plus a two-planet system with Earth and Mars. Show a classmate and explain which of the three shape types (Torus, Sphere, anchor offsets) was most satisfying to add.
