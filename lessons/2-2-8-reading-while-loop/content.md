## The while Loop

**What you'll learn:**
- How a `while` loop checks its condition before every run
- When to choose `while` over `for`
- What an infinite loop is and how to avoid it

A `while` loop keeps repeating as long as its condition is `true`. Unlike a `for` loop, the counter setup and increment are written separately:

```js
let count = 3;
while (count > 0) {
  // do something
  count--;   // IMPORTANT: always change the condition variable
}
```

`count--` is shorthand for `count = count - 1`.

**Infinite loop warning:** If you forget to change the variable that the condition checks, the condition stays `true` forever and the program freezes. Always make sure something inside the loop brings it closer to stopping.

Use `while` when you do not know in advance how many times to repeat, for example, "keep asking for input until the user enters a valid number."

## Read the chart, predict the output

Nothing to draw here. Just read this one and answer the questions underneath: reading a chart someone else drew is a skill of its own, and it is how you will meet most flowcharts for the rest of your life.

```flow readonly caption="Figure 2.2.5: a while loop drawn as a flowchart. Notice there is no hexagon: a while loop has no built-in counter, so the setup and the change are ordinary rectangles."
flowchart TD
  A([Start]) --> B[count = 3]
  B --> C{count > 0}
  C -- yes --> D[/print count/]
  D --> E[count = count - 1]
  E --> C
  C -- no --> F[/print "Liftoff!"/]
  F --> G([End])
```

Follow the arrows with a finger and answer these before running any code:

1. **What prints, in order?** Trace it pass by pass. Write the lines down.
2. **What is `count` when the diamond finally answers `no`?**
3. **What if `count` started at `0`?** Which shapes never get visited at all?
4. **Cover up the `count = count - 1` rectangle with your thumb.** What happens to the chart now, and what is that called?

That fourth question is the infinite loop, drawn. With the rectangle gone, the arrow still returns to the diamond, the diamond still asks `count > 0`, and the answer is still `yes`: forever. The `no` branch and the End oval are still on the page; the program just never reaches them. **An infinite loop is not a chart with a missing End. It is a chart with an End that nothing can get to.**

## The do…while Loop

**What you'll learn:**
- How `do…while` guarantees at least one run
- A short example that shows the difference from `while`

A `do…while` loop is the same as `while` except the body runs **first**, then the condition is checked. That means the body always executes at least once, even if the condition starts out `false`.

```
do {
  // runs at least once
} while (condition);
```

**Try it:** The first loop counts down from 3. The second `do…while` runs its body once even though its condition is already false from the start.

```js live plain
// while countdown
let count = 3;
while (count > 0) {
  console.log("Countdown: " + count);
  count--;
}
console.log("Liftoff!");

// do...while: body runs even when condition starts false
let x = 0;
do {
  console.log("do...while ran with x = " + x);
  x++;
} while (x < 1);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **while loop** | Repeats while a condition is true; condition is checked first |
| **do…while loop** | Like `while`, but the body runs at least once before the condition is checked |
| **`count--`** | Shorthand for `count = count - 1` |
| **infinite loop** | A loop whose condition never becomes false; program freezes |
| **condition variable** | The variable the loop checks: must change inside the loop to avoid an infinite loop |
