## The counter that resets

**Read after `5.5.1 Reading: Three places a variable can live`.**

**Goal:** see exactly what a local costs you when the value has to survive the call.

## Step 1: The version that never moves

Read this and press **Space** a few times.

```js live
class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    let n = 0;      // a brand-new local, every single call
    n += 1;         // the local goes up to 1...
    this.n = n;     // ...and is copied out before the call ends
  }
}

let c;

function setup() {
  new Canvas(220, 170);
  c = new Counter();
}

function draw() {
  background('#222');
  fill('white');
  textSize(32);
  textAlign(CENTER);
  text('count: ' + c.n, 110, 80);
  textSize(12);
  textAlign(LEFT);
  text('press Space', 20, 145);
  if (kb.presses('space')) c.tick();
}
```

**What you'll see:** the number stays at 1 no matter how many times you press. Every press makes a fresh `n`, sets it to 1, and overwrites `this.n` with it. The previous value was never read, so nothing accumulates.

The code runs, so nothing warns you. A local variable is not a mistake — it is the wrong *place* for this value.

## Step 2: Move the value to where it can survive

`tick()` has one job: change the count that the object already owns. That count is `this.n`, so the change belongs on `this.n` directly.

```js live
class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    this.n += 1;    // read this.n, add 1, store it back on this.n
  }
}

let c;

function setup() {
  new Canvas(220, 170);
  c = new Counter();
}

function draw() {
  background('#222');
  fill('white');
  textSize(32);
  textAlign(CENTER);
  text('count: ' + c.n, 110, 80);
  textSize(12);
  textAlign(LEFT);
  text('press Space', 20, 145);
  if (kb.presses('space')) c.tick();
}
```

**What you'll see:** 1, 2, 3, 4. `this.n += 1` reads the value that is still there from last time, adds one, and puts it back. The object remembered it because a property lives as long as the object, and `c` holds the object for the whole run.

## Step 3: Notice where the local was still fine

Delete the line `this.n = n;` from the first version and the local does nothing at all — no error, no effect. That is the honest test: **a local is for work you finish inside one call.** `let dx` and `let dy` in `distanceTo` (5.4.1) are exactly that — worked out, used, thrown away. Anything that must be true on the next frame cannot live in a local.

## Key takeaways

- A local is re-created on **every** call. A property is created once, in the constructor, and changed after that.
- Writing `let n = 0;` inside a method that is supposed to accumulate is the single most common version of this bug, and it produces no error message.
- `this.n += 1` is short for `this.n = this.n + 1`: read the old value, then write the new one back to the same place.
- The fix is almost never in `draw()`. It is in where the value was declared.
