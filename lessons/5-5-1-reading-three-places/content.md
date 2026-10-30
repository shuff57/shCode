## Three places a variable can live

**Read before `5.8.2 Worked Example: The counter that resets`.** About 5 minutes.

By the end of this reading you should be able to answer:

- Inside a method, where can a variable come from?
- Which of those places survives after the method finishes?
- Why can a second method not read the first one's `let`?

3.2.24 (Reading: Scope) gave you two places: **local**, declared inside a function and gone when it finishes, and **global**, declared outside and visible everywhere. A class adds a third, and it sits between them.

**The three places, in the order JavaScript looks:**

| Place | Written as | Lives | Seen by |
| --- | --- | --- | --- |
| local | `let step = 1;` inside a method | until that call finishes | only the lines in that method, after the declaration |
| instance | `this.count` | as long as the object does | every method of the class, and anyone holding the object |
| global | `let score = 0;` outside any function | the whole run | everything |

A **parameter** is a local too. `addBy(n)`'s `n` is born when the call starts and dies when it returns, for exactly the same reason `step` does.

**Try it:**

```js live
class Tally {
  constructor() {
    this.count = 0;      // instance: belongs to this Tally
  }

  addOnce() {
    let step = 1;       // local: born here, gone when addOnce returns
    this.count += step; // instance: still here on the next frame
  }
}

let t;

function setup() {
  new Canvas(320, 200);
  t = new Tally();
}

function draw() {
  background('#222');
  fill('white');
  textSize(20);
  text('count: ' + t.count, 20, 70);
  textSize(13);
  text('press Space', 20, 130);
  if (kb.presses('space')) t.addOnce();
}
```

**What you'll see:** the count climbs by one per press, and it keeps climbing. `step` is thrown away and re-made as `1` on every press — it never accumulates anything, because it does not outlive the call. `this.count` does accumulate, because the object outlives the call.

**Try this:** inside `addOnce()`, add the line `text('step is ' + step, 20, 160);` after `let step = 1;` and run it. It prints `step is 1` each time. Then move that same line into `draw()` and run it again: the sketch stops with a `ReferenceError`, because `draw` cannot see a local that belongs to `addOnce`. Move the line back before you carry on.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **local variable** | Declared inside a method; exists only while that call runs |
| **instance variable** | A property reached through `this`; exists as long as the object does and every method can see it |
| **global variable** | Declared outside every function; visible throughout the file |
| **parameter** | The name in a method's parentheses. A local, filled from the call's argument |
