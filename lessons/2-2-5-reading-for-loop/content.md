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

`i++` is shorthand for `i = i + 1` — it adds 1 to `i` each time.

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

The accumulator pattern — starting `total` at `0` and adding to it on every loop — is one of the most reused patterns in programming. Memorize the shape.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **for loop** | A loop that repeats a fixed, controlled number of times |
| **init** | The setup expression that runs once before the loop starts |
| **condition** | A true/false check evaluated before every repetition |
| **increment** | The expression that runs after every repetition (usually `i++`) |
| **`i++`** | Shorthand for `i = i + 1` |
| **accumulator** | A variable that collects a running total across loop iterations |
