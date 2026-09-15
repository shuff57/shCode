## Arrays and Functions

**What you'll learn:**
- How a whole array becomes a single function parameter
- Why you seed an accumulator with `numbers[0]` instead of `0`
- The empty-array-then-push-then-return shape for building a new list

A function parameter can hold a whole array. You read it inside the function with a loop, exactly as you would a named array.

**Try it:** `top` takes one array, walks it with `for...of`, and returns the largest value it finds.

```js live plain
function top(numbers) {
  let best = numbers[0];
  for (let n of numbers) {
    if (n > best) {
      best = n;
    }
  }
  return best;
}

console.log(top([7, 2, 11, 3]));   // 11
```

Notice the accumulator is seeded with `numbers[0]`, not `0`. If the list held only negatives, seeding with `0` would return `0` even though no number in the list is `0` — the function would report a value that was never there. Seeding with the first item guarantees the answer is always one of the array's own values.

The most reusable shape in this chapter is **build a new list**: start with an empty array, push each value that passes a test, then return the new array.

**Try it:**

```js live plain
function keepBig(numbers, cutoff) {
  let result = [];
  for (let n of numbers) {
    if (n >= cutoff) {
      result.push(n);
    }
  }
  return result;
}

console.log(keepBig([3, 9, 2, 7], 5));   // [9, 7]
```

One note for later. When you pass a number to a function, the function gets a **copy** — changing it inside does not touch your variable. An array is not copied that way: it is passed by reference, so mutating it inside the function is visible outside. That matters, but we keep it for Module 3.6 — for now, notice it and move on.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **array parameter** | A function parameter that receives a whole array |
| **seed the accumulator** | Start a running-best variable with `arr[0]`, not `0`, so the answer is always from the array |
| **build-a-new-list pattern** | Empty array → push matches → return; the reusable filter shape |
| **pass by reference** | An array passed to a function is not copied; changes inside are visible outside |
