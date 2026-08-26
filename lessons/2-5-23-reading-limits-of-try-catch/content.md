## It Cannot Catch a Syntax Error

**What you'll learn:**
- `try...catch` is not a universal safety net
- A syntax error stops the whole file from loading, including the `try` meant to guard it

JavaScript reads your entire program before running any of it. If the text does not parse, nothing runs, not even the `try` block:

```js
// This does NOT protect anything. The file never starts.
try {
  let x = ;
} catch (err) {
  console.log("never reached");
}
```

The `try` block here is not skipped over: the entire program fails to load. There is no running program in which `catch` could ever fire.

## It Only Catches Code That Runs Now

**What you'll learn:**
- `try...catch` guards the lines inside it, at the moment they execute
- A line outside the block is not protected, even if it comes right after

```js live plain
try {
  console.log("Inside try.");
} catch (err) {
  console.log("Not reached.");
}

console.log(outsideTheTry);
```

`"Inside try."` prints, then an **uncaught** error appears, because the last line sits outside the block. A `try...catch` protects what is *inside* it, and nothing else. (Code that runs later, on a delay, has left the block behind by the time it runs: that's a case you'll meet again once you've learned how to schedule work.)

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **uncaught error** | An error with no enclosing try...catch to run: it stops the program with no recovery |
