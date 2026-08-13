## Defining & Calling a Function

**What you'll learn:**
- How to define a function using the `function` keyword
- The difference between defining a function and calling it
- How to call (run) a function by writing its name with parentheses
- Why you can call the same function more than once

A **function** is a named block of code you write once and run whenever you need it.

**Defining** a function tells JavaScript what the function does — but nothing runs yet:

```
function greet() {
  console.log("Hello!");
}
```

**Calling** a function is what actually runs the code inside it:

```
greet();   // <-- this runs the code
```

If you define a function but never call it, nothing happens. You must call it.

**Try it:** Run the block below. Then add a third call `greet();` at the bottom and run it again to see the function run three times.

```js live plain
function greet() {
  console.log("Hello from greet!");
}

greet();
greet();
```

Notice the function body runs each time you call it. Defining it once, calling it many times, is exactly the point.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **function** | A named block of code you can run on demand |
| **define** | Write out the function body with `function name() { ... }` — does not run it |
| **call** | Execute the function by writing `name()` — this is what runs the code |
| **function body** | The code between `{` and `}` that runs when the function is called |
| **`function` keyword** | The word that starts a function definition |
