## The for Loop

**What you'll learn:**
- The three parts of a `for` loop: init, condition, increment
- How to count through a range of numbers
- How to accumulate a total inside a loop

A `for` loop repeats a block of code a controlled number of times. Its header has exactly three parts separated by semicolons:

```
for (init; condition; increment) { ... }
```

| Part | What it does | Example |
|------|--------------|---------|
| **init** | Runs once before the first loop. Usually creates a counter. | `let i = 1` |
| **condition** | Checked before every repetition. Loop stops when false. | `i <= 5` |
| **increment** | Runs after every repetition. Usually advances the counter. | `i++` |

`i++` is shorthand for `i = i + 1`: it adds 1 to `i` each time.

**Try it:** Run the block below. The first loop prints 1 through 5. The second loop adds those same numbers together and prints the total.

```js live plain
// Print 1 through 5
for (let i = 1; i <= 5; i++) {
  console.log(i);
}

// Sum 1 through 5
let total = 0;
for (let i = 1; i <= 5; i++) {
  total = total + i;
}
console.log("Sum of 1 to 5: " + total);
```

The accumulator pattern: starting `total` at `0` and adding to it on every loop: is one of the most reused patterns in programming. Memorize the shape.

> **Watch the condition.** `i <= 5` runs five times; `i < 5` runs only four. Changing one character changes the answer: when a loop runs one too many or one too few times, check the condition before anything else.

## The same loop, drawn

A `for` loop is three parts pretending to be one line, and a flowchart pulls them apart so you can see each one happen. Here is `for (let i = 1; i <= 5; i++)` drawn the long way: every part of the header as its own shape:

```flow readonly caption="Figure 2.2.3: a for loop drawn the long way. Init is a rectangle, the condition is a diamond, the increment is another rectangle, and the arrow from the increment back to the diamond is what makes it a loop."
flowchart TD
  A([Start]) --> B[i = 1]
  B --> C{i <= 5}
  C -- yes --> D[/print i/]
  D --> E[i = i + 1]
  E --> C
  C -- no --> F([End])
```

Follow the arrows and say what happens: *set i to 1; is i at most 5? yes, so print it, add one to i, and ask again. Eventually i is 6, the answer is no, and we end.*

Three things are worth noticing:

- **The condition is checked before every pass, including the first.** If you set `i = 9`, the diamond answers `no` immediately and the body never runs once.
- **The increment happens at the *bottom*, after the body.** That is why `i` is still `5` while the last line prints, not `6`.
- **The arrow from `i = i + 1` goes back to the diamond, not to the body.** Skipping the re-check would mean the loop never stops.

Five shapes for one line of code is a lot, which is why there is a shortcut: a single shape that holds the counter, the limit and the step together. You will meet it in the next lesson.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **loop** | A construct that repeats a block of code as long as a condition stays true |
| **for loop** | A loop that repeats a fixed, controlled number of times |
| **init** | The setup expression that runs once before the loop starts |
| **condition** | A true/false check evaluated before every repetition |
| **increment** | The expression that runs after every repetition (usually `i++`) |
| **`i++`** | Shorthand for `i = i + 1` |
| **accumulator** | A variable that collects a running total across loop iterations |
