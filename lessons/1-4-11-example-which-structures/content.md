**Goal:** Read three programs and name the structures in each, so that "sequence, selection, repetition" becomes something you can point at rather than something you can recite.

The test for each one is two questions: **does anything choose a path?** and **does anything happen more than once?**

## Program 1 — a receipt

```js live plain
let subtotal = 25;
let tax = subtotal * 0.08;
let total = subtotal + tax;
console.log(total);
```

Does anything choose a path? No — there is no `if`. Does anything happen more than once? No — every line runs exactly once.

**Sequence only.** Three assignments and a print, top to bottom. This is the simplest a program gets, and plenty of useful programs never become more than this.

## Program 2 — a receipt that knows about discounts

```js live plain
let subtotal = 25;

if (subtotal >= 20) {
  subtotal = subtotal - 5;
  console.log("discount applied");
}

let tax = subtotal * 0.08;
console.log(subtotal + tax);
```

Does anything choose a path? **Yes** — the `if`. Two of those lines run only when the subtotal is 20 or more. Does anything happen more than once? Still no.

**Sequence and selection.** Change `25` to `12` and run it again: the discount lines are skipped entirely and the program still finishes. That skipping is what selection *is*.

## Program 3 — a receipt for a whole cart

```js live plain
let prices = [8, 25, 3];
let total = 0;

for (let i = 0; i < prices.length; i = i + 1) {
  if (prices[i] >= 20) {
    console.log("big item: " + prices[i]);
  }
  total = total + prices[i];
}

console.log("total: " + total);
```

Does anything choose a path? Yes — the `if`, still. Does anything happen more than once? **Yes** — the lines inside the `for` run three times, once per price.

**All three.** And notice the shape: the selection sits *inside* the repetition, which sits inside the overall sequence. That nesting is where a program's apparent complexity comes from — but there is still nothing in here except the same three structures.

## Key takeaways

- Two questions identify any program's structures: does it choose, and does it repeat?
- Program 3 looks much harder than Program 1, and uses no new *kind* of thing.
- Structures nest — a selection inside a repetition inside a sequence.
- You are reading these, not writing them. Chapter 2 teaches `if` and `for` properly.
