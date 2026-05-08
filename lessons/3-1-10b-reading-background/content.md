# background() in 3D

`background(color)` sets the 3D scene's background color. It works exactly like q5play's `background()` — same call, same names and hex values.

```js
background('#000');    // black — classic space look
background('#111');    // near-black — shows shape edges clearly
background('navy');    // deep blue
```

## Why call it in draw()?

In q5play, calling `background()` at the top of draw() "wiped" the canvas clean each frame, preventing smearing. In shPlay the same principle applies — if you skip it, old frames can "stack" as visual artifacts.

**Always call `background()` at the top of `draw()`:**

```js
function draw() {
  background('#111');   // clear first
  cube.rotation.y += 0.01;  // then update
}
```

## Also call it in setup()

Calling `background()` in setup() sets the initial scene color before the first frame renders:

```js
function setup() {
  background('#000');
  cube = new Cube(0, 0, 0);
}

function draw() {
  background('#000');   // repeat each frame
  cube.rotation.y += 0.01;
}
```

## Background vs sky

`background()` sets a flat color — there is no gradient or sky texture in these early lessons. For space scenes, `'#000'` (black) is the go-to.
