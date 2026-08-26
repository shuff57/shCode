## An Error Stops Everything

**What you'll learn:**
- An error does not skip a line and move on: it stops the program right there
- Every line written *after* the failing line never runs, not just the failing one
- This is why an error anywhere in a long program throws away everything planned after it

Up to now, an error has meant your program did not work and you fixed it before running it again. This module is about errors caused by something outside your program being wrong at the *moment it runs*: the ones you cannot always fix in advance.

**Try it:** Run this. `total` was never declared.

```js live plain
console.log("Line 1 runs.");
console.log(total);
console.log("Line 3 never runs.");
```

Line 1 prints, then an error appears naming `total`. Line 3 is not skipped: it is never reached. The program stopped at line 2.

## Syntax Error vs Runtime Error

**What you'll learn:**
- A syntax error means the program never starts at all
- A runtime error means the program starts, runs some lines, and *then* fails
- Only a runtime error is something you can plan for and recover from

JavaScript reads your entire program before running any of it. `let x = ;` cannot be understood at all: nothing runs, not even the correct lines above the mistake. That is a **syntax error**.

```js live plain
let price = 10;
console.log("Price is " + price);
console.log(quantity);
```

This program is valid JavaScript. It parsed, it started, it ran two lines, and then failed on the third, because `quantity` was never declared. That is a **runtime error**: the engine understood the code well enough to start, and something went wrong while it was running.

The practical difference is *whose fault it is*. A syntax error is always yours: fix the code. A runtime error is often nobody's fault: a value that was never typed in, data that arrived in the wrong shape. You cannot fix those in advance, which is exactly why the rest of this module exists.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Runtime error** | An error that happens while a program is running, in code the engine understood well enough to start |
| **Syntax error** | An error found while the engine reads the code, before anything runs: nothing runs at all |
| **stops execution** | What a runtime error does: the rest of that run is abandoned, not merely skipped |
