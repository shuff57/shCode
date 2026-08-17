**Goal:** Predict what a loop prints before you run it, and practice choosing between `break` and `continue` from a plain-English description.

## Step 1 — Predict, then run

Before you hit Run: which numbers from 1 to 5 will print?

```js live plain
for (let i = 1; i <= 5; i++) {
  if (i === 3) {
    continue;
  }
  console.log(i);
}
```

It prints `1`, `2`, `4`, `5` — every number except 3. `continue` skips only the round where `i` is 3; the loop still runs all five rounds. Had this been `break` instead, the output would have stopped dead at `1 2` — the loop would never have reached 3, 4, or 5 at all.

## Step 2 — Choose the right tool

You're checking shelves 1 through 20 for the first one that's empty (say a shelf is empty whenever its number is a multiple of 7), and you want to stop the moment you find one. Which do you want — `break` or `continue`?

```js live plain
let shelf = 1;
let emptyShelf = null;

while (shelf <= 20) {
  if (shelf % 7 === 0) {
    emptyShelf = shelf;
    break;
  }
  shelf++;
}

console.log("First empty shelf is #" + emptyShelf);
```

`break` is right here. "Stop as soon as you find one" is exactly what `break` does. `continue` would keep checking every remaining shelf for no reason — you'd waste rounds looking past the one you already found, and you'd have to add extra bookkeeping to remember you already found one.

## Key takeaways

- `continue` skips one round and keeps looking; `break` stops looking entirely.
- If the task is "find the first one and stop," reach for `break`.
- If the task is "do this for everything except the ones that don't qualify," reach for `continue`.
