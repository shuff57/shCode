## Building With Returned Values

**What you'll learn:**
- How to pass the result of one function straight into another
- That the inner call always runs first
- Why the order of nested calls changes the answer
- Why returning functions compose and printing ones do not

Because a call to a returning function *is* a value, calls can be fed straight into other calls. This is how small functions build up to big programs.

```js
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

console.log(double(addTen(5)));
console.log(addTen(double(5)));
```

**Try it:** Run the block. The first line prints `30`, the second prints `20`, and the only difference is which call is written inside the other.

```js live plain
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

console.log(double(addTen(5)));
console.log(addTen(double(5)));
```

The inner call runs first. `addTen(5)` becomes `15`, then `double(15)` becomes `30`. Reverse the nesting and `double(5)` becomes `10` first, so `addTen(10)` is `20`. Reversing the order gives a different answer, which is worth checking whenever nested calls surprise you.

The power of this is that each function stays short and does one thing, yet the caller can chain them into a longer job:

```js live plain
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

const result = addTen(double(addTen(5)));
console.log(result);
```

Read it from the inside out: `addTen(5)` is `15`, `double(15)` is `30`, `addTen(30)` is `40`. Three small functions, four layers of work, and not one line of the logic was duplicated.

This only works because the functions return. A function that printed instead of returned would give `undefined` to the next call, and the chain would collapse into `NaN` or nonsense. Functions that return compose; functions that print do not.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **composition** | Using the value returned by one function as the argument to another |
| **inner call** | The call written inside the parentheses of the outer call; it runs first |
| **nesting order** | Which call wraps which; changing it changes the answer |
| **compose** | To chain returning functions so each builds on the last |
