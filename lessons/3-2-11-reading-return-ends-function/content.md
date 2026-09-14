## `return` Ends the Function

**What you'll learn:**
- That `return` hands back a value *and* stops the function
- Why code written after a `return` never runs
- How an early `return` replaces an `else`
- That a function returns exactly one value per call

`return` does two jobs at once: it hands back a value, and it **stops the function right there**. Anything after it does not run.

```js
function check(n) {
  return n * 2;
  console.log("This line never runs.");
}

console.log(check(5));
```

**Try it:** Run the block. The second line of the function is real code, but it is never reached, so the console shows only `10`.

```js live plain
function check(n) {
  return n * 2;
  console.log("This line never runs.");
}

console.log(check(5));
```

That is not a limitation; it is useful. A function can return early as soon as it knows the answer, and stop doing any further work:

```js live plain
function describeNumber(n) {
  if (n < 0) {
    return "negative";
  }
  if (n === 0) {
    return "zero";
  }
  return "positive";
}

console.log(describeNumber(-4));
console.log(describeNumber(0));
console.log(describeNumber(7));
```

There is no `else` anywhere, and none is needed. Once a `return` runs, the function is finished, so reaching the line after an `if` already tells you that `if` was false.

**Try it:** Change `describeNumber(-4)` to `describeNumber(5)` and predict the output before running it.

```js live plain
function describeNumber(n) {
  if (n < 0) {
    return "negative";
  }
  if (n === 0) {
    return "zero";
  }
  return "positive";
}

console.log(describeNumber(-4));
console.log(describeNumber(7));
```

A function returns exactly one value per call, however many `return` statements it contains. The extra ones are not decorations: they are the exits for the cases the earlier ones did not take. Only one of them runs, and whichever runs is the end of that call.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **early return** | Returning as soon as the answer is known, instead of branching with `else` |
| **unreachable code** | Code written after a `return`, which never executes |
| **`else` replacement** | Reaching the next line already proves the earlier condition was false |
| **one value per call** | A function returns a single result, whichever `return` fired |
