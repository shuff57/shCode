**Goal:** Read `this` like a pronoun — replace it with whatever variable sits on the left of the dot at the call site.

## Step 1 — The class and two instances

Here's the full class. Run it and confirm both counters start at 0.

```js live
class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    this.n += 1;
  }
}

let c1, c2;

function setup() {
  new Canvas(360, 180);
  c1 = new Counter();
  c2 = new Counter();
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text('c1.n = ' + c1.n, 20, 80);
  text('c2.n = ' + c2.n, 20, 120);
}
```

**What you'll see:** `c1.n = 0` and `c2.n = 0`. Two counters, each holding its own `n`.

## Step 2 — Substitute `c1` for `this` when calling `c1.tick()`

Now add a space-bar call to `c1.tick()`. Each press increments only `c1`. Watch the substitution rule in action:

When you call `c1.tick()`, JavaScript reads the `tick()` body:
```
this.n += 1;
```
and mentally replaces `this` with `c1`:
```
c1.n += 1;
```
That one line runs. `c2.n` is never touched.

```js live
class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    this.n += 1;
  }
}

let c1, c2;

function setup() {
  new Canvas(360, 180);
  c1 = new Counter();
  c2 = new Counter();
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text('c1.n = ' + c1.n, 20, 80);
  text('c2.n = ' + c2.n, 20, 120);
  fill('gray');
  textSize(12);
  text('press Space → c1.tick()', 20, 160);
  if (kb.presses('space')) c1.tick();
}
```

**What you'll see:** pressing Space increments `c1.n` only. `c2.n` stays 0.

**Try this:** change the call to `c2.tick()`. Now the substitution yields `c2.n += 1`, so `c2` grows and `c1` stays put. Same method body, different substitution.

## Step 3 — Apply the rule to a second method

The same substitution works for any method. Here `double()` uses `this.n *= 2`. Apply the rule yourself:

- `c1.double()` → substitute `this` with `c1` → `c1.n *= 2`
- `c2.double()` → substitute `this` with `c2` → `c2.n *= 2`

```js live
class Counter {
  constructor() {
    this.n = 0;
  }

  tick() {
    this.n += 1;
  }

  double() {
    this.n *= 2;
  }
}

let c1, c2;

function setup() {
  new Canvas(360, 200);
  c1 = new Counter();
  c2 = new Counter();
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text('c1.n = ' + c1.n, 20, 80);
  text('c2.n = ' + c2.n, 20, 120);
  fill('gray');
  textSize(12);
  text('Space = c1.tick()   D = c1.double()', 20, 170);
  if (kb.presses('space')) c1.tick();
  if (kb.presses('d')) c1.double();
}
```

**What you'll see:** Space ticks `c1`; D doubles `c1`. `c2` is untouched.

**Try this:** call `c2.double()` on the `f` key. Write out the substitution (`c2.n *= 2`) before you run it. Then confirm.

## Key takeaways

- `this` is a pronoun — substitute the variable on the left of the dot at each call site.
- The same method body runs for every instance; only the substitution changes.
- Two instances, two substitutions, completely independent state.
