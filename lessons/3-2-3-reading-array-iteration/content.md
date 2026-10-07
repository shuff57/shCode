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

### The off-by-one: one round too many

The last item of an array sits at index `length - 1`, so a counted loop has to stop **before** `length`. Write `<=` where `<` belongs and the loop runs one round too many. That slip is common enough to have a name: an **off-by-one error**.

**Try it:** Run the block. The array holds three prices, but four lines appear.

```js live plain
let prices = [4, 9, 6];

for (let i = 0; i <= prices.length; i++) {
    console.log(prices[i]);
}
```

`4`, `9`, `6`, and then `undefined`. On the last round `i` is `3`, and `prices[3]` is one place past the end of the array (3.3.2), so it holds nothing. Nothing crashes, which is why this bug is easy to miss: the program just prints an extra line. If you ever see a stray `undefined` at the end of a loop's output, check the condition first. Change `<=` to `<` and run it again to see the extra line disappear. You met the same trap with the letters of a word in 2.2.19; arrays behave the same way. The next lab gives you a loop with this bug to fix.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **iteration** | Visiting every item in a list one at a time |
| **`for` loop** | Loop that counts with an index variable (`i = 0; i < arr.length; i++`) |
| **`for...of` loop** | Loop that gives you each value directly, no index needed |
| **`arr.length`** | The number of items; used as the stop condition in a `for` loop |
| **off-by-one error** | A loop that runs one round too many or too few, such as `i <= arr.length` instead of `i < arr.length` |
| **accumulator** | A variable (like `total`) that collects a running result across loop iterations |
