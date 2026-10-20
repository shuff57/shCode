## Catching an Error

**What you'll learn:**
- `try { ... } catch (err) { ... }` says "attempt this, and if it fails, do that instead"
- The line right after a failure inside `try` does **not** run: `try` abandons the rest of the block, it does not resume it
- The program keeps going after the whole `try...catch` finishes, even though something failed inside it

```js live plain
try {
  console.log("Trying...");
  console.log(quantity);
  console.log("This line never runs.");
} catch (err) {
  console.log("Something went wrong, but we recovered.");
}

console.log("The program keeps going.");
```

Three things happen: the line after the error inside `try` is skipped, `catch` runs instead, and the program continues afterward. Without the `try...catch`, that last line would never print: the whole program would have stopped at `quantity`.

```flow readonly caption="Figure 2.5.4: the first example. The error on the quantity line abandons the rest of try, so the third line never runs. catch runs instead, and the program carries on afterward."
flowchart LR
  A([Start]) --> B[/try: log Trying/]
  B --> C[read quantity: it does not exist, so an error]
  C --> D[/catch: log Something went wrong, but we recovered/]
  D --> E[/log The program keeps going/]
  E --> F([End])
```

The name in the parentheses after `catch`: `err` above: is yours to choose. It holds a value describing what went wrong; the next reading unpacks it.

## When Nothing Goes Wrong

**What you'll learn:**
- `catch` only runs when something inside `try` actually fails
- `catch` is not an "afterwards" block: it is an "instead" block

```js live plain
try {
  console.log("Trying...");
  console.log("All fine.");
} catch (err) {
  console.log("This is skipped when there is no error.");
}

console.log("Done.");
```

Nothing failed, so `catch` never ran. Every line inside `try` ran normally, and the program moved on.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`try...catch`** | Runs `try`; on a runtime error, abandons the rest of `try` and runs `catch` instead |
| **`try` block** | The code you are attempting; abandoned partway through if it errors |
| **`catch` block** | Runs only when `try` failed; skipped entirely otherwise |
| **`err`** | The name for `catch`'s parameter: yours to choose, holds what went wrong |
