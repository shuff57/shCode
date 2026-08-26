# 2.2.5 Worked Example: Sprite Showcase

In 2.2.4 you proved that `Sprite` is a class and `player` is one instance of it. In this example you're going to walk through a bunch of sprites and read every line as **OOP code**: `new Sprite(...)` is a constructor call, `sprite.color = ...` is a property assignment on one specific instance. Six sprites, three shapes, lots of color: the same code you've been writing since 2.1, now with a name for what's happening.

---

## Worked Example: Read every line as OOP

**Goal:** Recognize constructor calls and property assignments in a sketch you can already read, and feel that every visible thing on screen is an object with its own state.

### Step 1: One sprite, one constructor call

```js live
function setup() {
  new Canvas(400, 400);

  const box = new Sprite(80, 80, 80, 60);
  box.color = 'deepskyblue';
}

function draw() {
  background('#111');
}
```

Run it. A single rectangle appears at (80, 80). Read the code as OOP:

- **`new Sprite(80, 80, 80, 60)`**: a constructor call. Arguments are `(x, y, width, height)`. The constructor stamps out a fresh instance and returns it.
- **`const box = ...`**: the new instance is stored in a variable so we can reach it after construction.
- **`box.color = 'deepskyblue'`**: property assignment. This mutates *only* this instance. A second sprite created later would have its own `.color`.

Change the coordinates and size. Every tweak is a different argument passed into the same constructor.

### Step 2: Three shape forms from one constructor

The `Sprite` constructor has two forms depending on how many size arguments you give it. Run this:

```js live
function setup() {
  new Canvas(400, 400);

  // (x, y, width, height): rectangle
  const box = new Sprite(100, 200, 120, 60);
  box.color = 'deepskyblue';

  // width and height the same: a square
  const square = new Sprite(220, 200, 60, 60);
  square.color = 'tomato';

  // (x, y, diameter): one size argument makes a circle
  const ball = new Sprite(320, 200, 60);
  ball.color = 'gold';
}

function draw() {
  background('#111');
}
```

Three instances of the *same class*, each with different constructor arguments. The class decides "3 numbers after x/y → I'm a circle; 4 numbers → I'm a rectangle." You didn't write that logic: the class did, inside its constructor.

### Step 3: Properties beyond `.color`

Every sprite instance carries a bundle of properties. You've mostly used `.color`, but there are more. Run this to see `.stroke` and `.strokeWeight` at work:

```js live
function setup() {
  new Canvas(400, 400);

  const filled = new Sprite(120, 200, 120);
  filled.color = 'deepskyblue';

  const outlined = new Sprite(280, 200, 120);
  outlined.color = '#222';
  outlined.stroke = 'deepskyblue';
  outlined.strokeWeight = 6;
}

function draw() {
  background('#111');
}
```

Both sprites were built by the same constructor. Both share the same set of *available* properties. The difference is which ones each instance actually sets. The left circle is filled solid; the right one is a dark fill with a thick outline: same class, different property values.

### Step 4: Read the full showcase

Now put it together. Six sprites on one canvas. Before you Run, read through the code and, for each sprite, ask yourself:

1. Which constructor form is this: `(x, y, w, h)` or `(x, y, d)`?
2. Which properties does this specific instance set?

```js live
function setup() {
  new Canvas(400, 400);

  const box = new Sprite(80, 80, 80, 60);
  box.color = 'deepskyblue';

  const square = new Sprite(200, 80, 60, 60);
  square.color = 'tomato';

  const tower = new Sprite(320, 80, 40, 100);
  tower.color = '#a78bfa';

  const ball = new Sprite(80, 260, 70);
  ball.color = 'gold';

  const dot = new Sprite(200, 260, 40);
  dot.color = 'rgba(16, 185, 129, 0.6)';

  const planet = new Sprite(320, 260, 90);
  planet.color = '#222';
  planet.stroke = 'deepskyblue';
  planet.strokeWeight = 4;
}

function draw() {
  background('#111');
}
```

Run. Six sprites: three rectangles (top row) and three circles (bottom row). That's six separate instances, six separate chunks of memory, six independent sets of property values: all stamped from the same blueprint called `Sprite`.

### Try this

Pick two changes to experiment with:

- Swap any `.color` to `'tomato'`, `'#8ef'`, `'rgba(0,255,0,0.5)'`: any CSS color string works.
- Add a `.stroke` and `.strokeWeight` to one of the rectangles. The properties belong to every `Sprite` instance, even if you haven't used them before.
- Copy the `const planet = ...` block, rename it, and change the coordinates. You've just instantiated a seventh object from the class.

### Key takeaways

- **Every `new Sprite(...)` is a constructor call.** It builds a fresh object and returns it. Six `new Sprite(...)` lines → six distinct objects in memory.
- **Every `sprite.color = ...` is a property assignment on one specific instance.** Setting `box.color` has no effect on `square.color`.
- **One class, many instances.** The class (`Sprite`) defines the shape and behavior. The instances (`box`, `square`, `ball`, …) each carry their own data inside that shape.
- **Constructor overloads are normal.** `(x, y, w, h)` vs `(x, y, d)` is just the class reading its own arguments and deciding what to build. Your own classes can do the same.
