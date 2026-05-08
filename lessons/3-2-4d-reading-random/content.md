# random(min, max)

The `random()` helper returns a **random floating-point number** between `min` (inclusive) and `max` (exclusive). You already met it in q5play — it works identically in shPlay.

## Basic usage

```js
let x = random(-5, 5);    // a random number between -5 and 5
let r = random(0.3, 1.0); // a random radius between 0.3 and 1.0
```

## Placing shapes at random positions

Call `random()` inside `setup()` when you want each run to look different:

```js
let ball;

function setup() {
  ball = new Sphere(random(-4, 4), random(-2, 2), random(-3, 3), 0.5);
  ball.color = 'tomato';
}

function draw() {
  background('#111');
}
```

Each time you click Run, the ball appears somewhere new.

## Using random() in a loop

```js
let spheres = [];

function setup() {
  for (let i = 0; i < 5; i++) {
    let s = new Sphere(random(-5, 5), random(-2, 2), random(-4, 0), 0.4);
    s.color = 'deepskyblue';
    spheres.push(s);
  }
}

function draw() {
  background('#111');
}
```

## Important: run once in setup(), not every frame

Calling `random()` inside `draw()` regenerates the value 60 times per second — the shape flickers wildly. Call it in `setup()` if you want a stable random placement.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| `random(min, max)` | Returns a random float in [min, max) |
| float | A number with a decimal point (e.g., 3.14, -0.87) |
| seed | A starting value that fixes the random sequence — shPlay doesn't expose this; each run is independent |
