## Defining, Calling, and Hoisting

**What you'll learn:**
- What JavaScript actually does, step by step, when it reads a `function` definition
- Why `printWelcome`, not `print_welcome` — the camelCase convention for function names
- A call written *above* its definition can still work, and why

### Trace it: a welcome message function

```js live plain
function printWelcome() {
  console.log("Welcome to the program!");
  console.log("We hope you enjoy using it.");
}

printWelcome();
```

Run it, then walk through what actually happened, in order:

1. JavaScript reads the `function printWelcome() {` line and **stores** the definition. It does **not** run the body yet.
2. It skips past the body and keeps reading.
3. It reaches `printWelcome();` — a call. It jumps back into the stored body.
4. It runs both `console.log()` statements.
5. It returns to the line after the call. The program ends.

Notice the name: `printWelcome`, not `print_welcome`. JavaScript convention is **camelCase** — first word lowercase, each later word capitalized, no underscores. The same rule you learned for variable names applies to function names too.

### The surprising case: calling before defining

```js live plain
sayHello();

function sayHello() {
  console.log("Hello from a function defined below!");
}
```

Run it. This works, even though the call comes *before* the definition on the page. Before running anything, JavaScript scans the whole file and registers every `function` declaration first. By the time the first line actually executes, `sayHello` already exists. This scan-first behavior is called **hoisting**.

Do not lean on this. Hoisting is real, but code that calls things before defining them is harder for another reader to follow, and it does not apply to every way of making a function — you will meet the ways it *doesn't* apply in Section 3.2. Define first, call after. Knowing hoisting exists mostly helps you understand why a call that "should" have failed did not.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **camelCase** | The JavaScript naming convention: first word lowercase, later words capitalized, no underscores |
| **hoisting** | JavaScript's scan of the file before running it, which registers function declarations so they can be called from earlier lines |
