# What is .position?

Every shape in shPlay has a `.position` property. It is a **Vector3** — an object that holds three numbers:

```js
shape.position.x   // left-right
shape.position.y   // up-down
shape.position.z   // depth (toward/away)
```

## Setting position in setup()

You can place a shape at a specific location right after creating it:

```js
let cube;

function setup() {
  cube = new Cube(0, 0, 0);   // created at the origin
  cube.position.x = 2;        // now moved 2 units right
  cube.position.y = 1;        // and 1 unit up
}
```

Alternatively, pass the position directly to the constructor:

```js
cube = new Cube(2, 1, 0);    // same result — x=2, y=1, z=0
```

## The position object

`cube.position` is a live object. Reading `cube.position.x` gives you the current X. Writing to it moves the shape immediately.

```js
cube.position.x = 3;   // set: moves cube to x=3
cube.position.x;       // read: returns 3
```

## Next up

Setting position once in setup() places a shape. To make a shape **move**, you change position in draw() — that is the next lesson.
