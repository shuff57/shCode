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

Use `while` when you do not know in advance how many times to repeat — for example, "keep asking for input until the user enters a valid number."

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

```js live console
// while countdown
let count = 3;
while (count > 0) {
  console.log("Countdown: " + count);
  count--;
}
console.log("Liftoff!");

// do...while — body runs even when condition starts false
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
| **condition variable** | The variable the loop checks — must change inside the loop to avoid an infinite loop |
