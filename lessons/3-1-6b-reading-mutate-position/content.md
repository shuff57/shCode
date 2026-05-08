# Mutating position in draw()

In q5play you wrote `sprite.vel.x = 4` to move a sprite each frame. shPlay does not have a built-in velocity system — you add the delta yourself inside `draw()`:

```js
function draw() {
  background('#111');
  cube.position.x += 0.05;   // moves 0.05 units right every frame
}
```

Since `draw()` runs ~60 times per second, `+= 0.05` per frame means the cube drifts about 3 units per second to the right.

## setup() vs draw()

| | setup() | draw() |
|---|---|---|
| Runs | Once | Every frame |
| Use for | Creating shapes, setting initial position | Animating, moving, rotating |

```js
let cube;

function setup() {
  background('#111');
  cube = new Cube(0, 0, 0);   // create once
}

function draw() {
  background('#111');
  cube.position.x += 0.05;   // update every frame → motion
}
```

## Any axis works

You can mutate `.position.y` to make a shape float up, or `.position.z` to send it toward or away from the camera:

```js
cube.position.y += 0.02;   // rises slowly
cube.position.z -= 0.03;   // moves away from viewer
```

## The explicit delta trade-off

You write the delta explicitly — no hidden velocity object. This is more typing but also more control: you can change direction, speed, or axis anytime inside draw() without a separate API.
