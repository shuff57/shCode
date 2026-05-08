# Arrays of 3D Instances

When you have many objects of the same class, store them in an array and loop over them.

## Declaring the array

Declare an empty array before `setup()`:

```js
let planets = [];
```

## Filling the array in setup()

Use `push()` to add new instances:

```js
function setup() {
  planets.push(new Planet(-3, 0, 0, 0.5));
  planets.push(new Planet( 0, 0, 0, 0.8));
  planets.push(new Planet( 3, 0, 0, 0.4));
}
```

Each `push()` call creates a new `Planet` and adds it to the array. The three planets are independent — different positions and radii.

## Looping in draw()

Use `for...of` to call `update()` on every instance:

```js
function draw() {
  background('#000');
  for (let p of planets) {
    p.update();
  }
}
```

`for (let p of planets)` gives you each `Planet` in order, one at a time. Calling `p.update()` runs that planet's own per-frame logic. Adding a fourth planet is one new `push()` line — `draw()` does not change.

## The full pattern together

```js
class Planet {
  constructor(x, y, z, radius) {
    this.shape = new Sphere(x, y, z, radius);
  }
  update() {
    this.shape.rotation.y += 0.01;
  }
}

let planets = [];

function setup() {
  planets.push(new Planet(-3, 0, 0, 0.5));
  planets.push(new Planet( 0, 0, 0, 0.8));
  planets.push(new Planet( 3, 0, 0, 0.4));
}

function draw() {
  background('#000');
  for (let p of planets) {
    p.update();
  }
}
```

Three planets, each spinning independently, `draw()` unchanged when you add more.

---

## Glossary

| Term | Meaning |
|---|---|
| array | An ordered list of values, declared with `[]` |
| push() | Adds an item to the end of an array |
| for...of | Loops over each item in an array: `for (let item of array)` |
| instance | One object created from a class with `new` |
