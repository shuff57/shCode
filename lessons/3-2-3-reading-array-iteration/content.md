## Looping Over Arrays: for / for…of

**What you'll learn:**
- How to visit every item in an array using a plain `for` loop and the index
- How `for...of` lets you loop without writing an index at all
- When to use each style (index needed vs. just the value)
- How to accumulate a total by looping over a number array

### Using a for loop with the index

A plain `for` loop counts from `0` up to (but not including) `arr.length`. Inside the loop, `arr[i]` is the current item:

```js
for (let i = 0; i < scores.length; i++) {
    console.log(scores[i]);
}
```

Use this style when you need to know the position of each item (e.g., to print "item 1 is…").

### Using for…of

`for...of` visits each item directly without an index variable. It is cleaner when you only care about the value:

```js
for (const item of scores) {
    console.log(item);
}
```

**Try it:** The block below sums an array with a `for` loop, then prints each item with `for...of`.

```js live plain
let scores = [10, 20, 30, 40, 50];

// Sum using a for loop (needs the index to accumulate)
let total = 0;
for (let i = 0; i < scores.length; i++) {
    total = total + scores[i];
}
console.log("Total:", total);      // 150

// Print each item using for...of (no index needed)
for (const score of scores) {
    console.log("Score:", score);
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **iteration** | Visiting every item in a list one at a time |
| **`for` loop** | Loop that counts with an index variable (`i = 0; i < arr.length; i++`) |
| **`for...of` loop** | Loop that gives you each value directly, no index needed |
| **`arr.length`** | The number of items; used as the stop condition in a `for` loop |
| **accumulator** | A variable (like `total`) that collects a running result across loop iterations |
