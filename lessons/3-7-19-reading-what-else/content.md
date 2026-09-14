## What Else Is Out There

**What you'll learn from it:**
- That arrays have many more methods than the four this module teaches
- What each of the other common methods does, in one line
- Which of them change the array in place and which return something new
- That `.every()` exists and answers a single true/false

This module teaches four methods: `.map()`, `.slice()`, `.concat()`, and spread. Those are the ones this book goes on to use. Arrays have many more, and the rest are worth knowing exist so you recognize them in other people's code.

**Try it:** Run the block. You are not expected to memorize these — just read what each line does and notice the one that changes the array in place.

```js live plain
const nums = [4, 1, 3, 2];

// .includes(value) asks true/false
console.log(nums.includes(3));

// .indexOf(value) gives the position, or -1
console.log(nums.indexOf(2));

// .every(callback) is true only if EVERY element passes
console.log(nums.every((n) => n > 0));

// .forEach(callback) runs once per item and returns nothing
nums.forEach((n) => console.log("item:", n));

// .sort() and .reverse() change the array IN PLACE
const ordered = nums.slice();
ordered.sort((a, b) => a - b);
console.log(ordered);
```

Here is the full list, each in one line:

- **`.filter(callback)`** — like `.map()`, but keeps only the elements whose callback returns `true`. The result is usually **shorter** than the input.
- **`.forEach(callback)`** — runs the callback once per element and returns nothing. A `for` loop with different punctuation.
- **`.reduce(callback, start)`** — combines all the elements into one value, such as a total.
- **`.indexOf(value)` and `.includes(value)`** — search for a value, giving its position or `true`/`false`.
- **`.sort()` and `.reverse()`** — reorder the array **in place**, changing the original, unlike everything this module taught.
- **`.every(callback)`** — checks the callback against every element and answers a single `true`/`false`: `true` only if every element passed.

Notice the split. `.filter()`, `.forEach()` and `.reduce()` leave the original alone. `.sort()` and `.reverse()` do not — they reorder the array they are called on, which is why the demo above sorts a `.slice()` copy. Chapter 11 implements sorting and searching by hand rather than calling `.sort()`, because writing them is the lesson there.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.filter(callback)`** | Keeps the elements whose callback returns `true`; result is shorter or equal |
| **`.forEach(callback)`** | Runs the callback once per element; returns nothing |
| **`.reduce(callback, start)`** | Combines all elements into one value, such as a total |
| **`.indexOf(value)` / `.includes(value)`** | Search for a value: its position, or `true`/`false` |
| **`.sort()` / `.reverse()`** | Reorder the array **in place**, changing the original |
| **`.every(callback)`** | `true` only if every element passes the callback's test |
