**Goal:** Before writing a single loop, practice picking `for` or `while` from a plain-English description.

## Step 1 — Printing a list of 12 names

You have exactly 12 names to print, one per line. Before you run it, decide: is the count known ahead of time?

```js live plain
let count = 12;

for (let i = 1; i <= count; i++) {
  console.log("Name #" + i);
}
```

Yes — `12` is known before the loop starts, so `for` is the natural fit. A `while` loop *could* do this too, but it would need an extra line to hold the counter and another to advance it, for no benefit.

## Step 2 — Shuffling until the top card is an ace

Now the opposite case: keep shuffling a deck until the top card happens to be an ace. Run this a few times — the number of shuffles it takes changes every time.

```js live plain
let topCard = Math.floor(Math.random() * 13); // 0 = ace
let shuffles = 0;

while (topCard !== 0) {
  topCard = Math.floor(Math.random() * 13);
  shuffles++;
}

console.log("Took " + shuffles + " shuffle(s) to get an ace.");
```

Nobody can say in advance how many shuffles it takes — the stopping point depends on the result of the work itself, not on a count you picked beforehand. That is exactly the shape `while` is for.

## Step 3 — The trap: "either works" is not the same as "either is right"

Both loops *can* print 12 names, and both loops *can* shuffle until an ace shows. The question is never "which loop is capable of this" — it's "which loop tells the reader the truth about why this repeats." Forcing a `for` loop onto the shuffle would mean inventing a fake maximum ("shuffle up to 1000 times, just in case") that has nothing to do with the actual stopping condition.

## Key takeaways

- If you can say the repeat count out loud before running the program, use `for`.
- If the honest answer is "however many it takes," use `while`.
- Both loops can technically do either job — the choice is about which one tells the truth about *why* the loop stops.
