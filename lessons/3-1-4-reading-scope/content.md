## Scope: Local vs Global

**What you'll learn:**
- What "scope" means: where a variable can be seen and used
- The difference between a local variable and a global variable
- Why code outside a function cannot see variables declared inside it
- How global variables are readable from inside a function

**Scope** is the region of your program where a variable exists. JavaScript has two basic scopes to know right now: **local** and **global**.

### Local variables: born inside, invisible outside

A variable declared with `let` inside a function is **local** to that function. It springs into existence when the function runs and vanishes when the function finishes. Code outside the function has no way to reach it.

If you tried to read a local variable from outside the function, JavaScript would throw a `ReferenceError`. The block below does NOT do that: it demonstrates the safe, working side of local scope, and the explanation above covers what happens if you tried.

### Global variables: declared outside, readable everywhere

A variable declared outside any function is **global**. It exists for the whole program, and code inside a function can read it freely.

**Try it:** Run the block and read each line of output. Notice that `score` (global) is visible inside `showResult`, but `label` (local) is only used inside `describeScore` and never touched outside.

```js live plain
let score = 42;   // global: declared outside any function

function showResult() {
  // reading the global variable from inside a function: works fine
  console.log("Score is: " + score);
}

function describeScore() {
  let label = "points";   // local, only exists inside describeScore
  console.log(score + " " + label);
}

showResult();
describeScore();

// 'label' does not exist out here.
// If we tried console.log(label) at this point, we'd get a ReferenceError.
// Try uncommenting the line below to see that error:
// console.log(label);
```

The commented-out line at the bottom shows what would happen if you tried to access a local variable from outside: a `ReferenceError: label is not defined`. Keep it commented so the block runs cleanly; uncomment it only if you want to see the error for yourself.

### Why does scope matter?

Local variables protect you from name collisions. Two different functions can each have a variable called `total` and they will never interfere with each other, because each `total` is local to its own function.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **scope** | The region of a program where a variable is visible and usable |
| **local variable** | A variable declared inside a function, only accessible within that function |
| **global variable** | A variable declared outside all functions: accessible anywhere in the program |
| **`ReferenceError`** | The error JavaScript throws when you try to use a variable that doesn't exist in the current scope |
| **name collision** | Two variables with the same name interfering: local scope prevents this between functions |
