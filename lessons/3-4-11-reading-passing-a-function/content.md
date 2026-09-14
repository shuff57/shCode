## Passing a Function to a Function

**What you'll learn:**
- That a function can take another function as a parameter
- That a callback is passed **without** parentheses
- That the receiving function decides when and with what to call it
- Why separating the loop from the rule is the point

Here is why any of this matters. Since a function is a value, a function can take **another function** as a parameter. A function passed this way is called a **callback**: the receiving function calls it, and it decides when and with what values.

**Try it:** `applyTwice` takes an operation and a value. It does not know what the operation is; it just calls it twice.

```js live plain
function applyTwice(operation, value) {
  return operation(operation(value));
}

const double = (n) => n * 2;
const addTen = (n) => n + 10;

console.log(applyTwice(double, 5));
console.log(applyTwice(addTen, 5));
```

It prints `20` then `25`. Handed `double`, it doubled `5` to `10` and again to `20`; handed `addTen`, the same code produced `25`.

Note carefully: `applyTwice(double, 5)` passes `double` **without parentheses**. Writing `applyTwice(double(), 5)` would call `double` first and hand over its *result* — a number — which `applyTwice` would then try to call, and fail.

Because a callback is often used in only one place, it is usually written inline as an arrow rather than named first.

**Try it:** The same `applyTwice` with three different inline arrows.

```js live plain
function applyTwice(operation, value) {
  return operation(operation(value));
}

console.log(applyTwice((n) => n * 2, 5));
console.log(applyTwice((n) => n - 1, 5));
console.log(applyTwice((s) => s + "!", "hi"));
```

The real payoff is separating two jobs that would otherwise be tangled together: the loop that walks a list, and the rule that says what counts.

**Try it:** One loop, written once, answers three different questions. The loop knows how to count; the callback knows what counts.

```js live plain
function countMatching(numbers, test) {
  let count = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (test(numbers[i])) {
      count = count + 1;
    }
  }
  return count;
}

const readings = [4, -2, 7, 0, -9, 3];

console.log(countMatching(readings, (n) => n > 0));
console.log(countMatching(readings, (n) => n < 0));
console.log(countMatching(readings, (n) => n % 2 === 0));
```

Swap the callback and you swap the question, without touching the loop. This is the idea the array methods build on.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **callback** | A function passed to another function so it can be called |
| **higher-order function** | A function that takes a function as an argument (`applyTwice`, `countMatching`) |
| **no parentheses** | Pass the function itself (`double`), not its result (`double()`) |
| **inline callback** | A callback written directly in the call, as an arrow |
| **separate the jobs** | The loop walks the list; the callback decides what matches |
