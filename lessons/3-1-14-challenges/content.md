# Challenges — Spinning Sculpture Extensions

Start from your completed Spinning Sculpture (3.1.12). Pick one or more challenges below.

---

## Challenge 1 — Chain a Third Cube (medium)

Add a third Cube parented to `smallCube` so the sculpture forms a chain: `bigCube → smallCube → tinyTop`. Give `tinyTop` its own rotation direction and speed.

**Target shape:**

```js
let tinyTop;

function setup() {
  // ...existing bigCube and smallCube setup...
  tinyTop = new Cube(0, 0, 0);
  tinyTop.color = 'hotpink';
  tinyTop.size = 0.35;
  parent(tinyTop, smallCube);
  tinyTop.position.y = 1.0;
}

function draw() {
  // ...existing rotations...
  tinyTop.rotation.y = radians(frameCount * 4);
}
```

**Hints:**
- `parent(tinyTop, smallCube)` makes `tinyTop` a child of `smallCube`, which is already a child of `bigCube`. The full chain transforms stack.
- The auto-grader looks for two separate `parent(...)` calls in the sketch.

---

## Challenge 2 — Pulsing Scale (easy)

Drive `bigCube.size` with `Math.sin(radians(frameCount * speed))` so the sculpture grows and shrinks rhythmically.

**Target shape:**

```js
function draw() {
  // ...existing rotations and color cycle...
  bigCube.size = 1 + 0.4 * Math.sin(radians(frameCount * 1.5));
}
```

**Hints:**
- `Math.sin(...)` oscillates between -1 and +1. Adding 1 shifts it to 0–2; multiplying by 0.4 narrows the range to 0.6–1.4.
- The auto-grader looks for `.size =` combined with `Math.sin` in the same line or nearby.

---

## Challenge 3 — Freeze Toggle (hard)

Add a `let frozen = false` state variable. When the user presses Space, toggle `frozen`. When `frozen` is true, skip all rotation updates so the sculpture freezes mid-spin.

**Target shape:**

```js
let frozen = false;

function draw() {
  background('#000');
  if (kb.presses('space')) frozen = !frozen;
  if (!frozen) {
    bigCube.rotation.y = radians(frameCount * 1.5);
    // ...other rotations...
  }
}
```

**Hints:**
- `!frozen` is the boolean flip. `kb.presses('space')` fires once per keypress (not every frame while held).
- The auto-grader looks for `let frozen` and `kb.pressing` or `kb.presses` in the sketch.

---

## If you finish all three

Combine: a three-cube chain that pulses in scale and can be frozen with Space. Show a classmate and explain which transform concept (parenting, Math.sin on scale, or keyboard state) you found most useful.
