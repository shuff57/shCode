## Chart the Code — Validate Before You Trust

**What you'll practise:**
- Drawing two checks in a row, each one a diamond
- Sending a failing check's `yes` branch to a `throw`, not to the next check
- Only reaching the real work after both checks pass

### The code

```js
const typed = "abc";
const quantity = Number(typed);

if (Number.isNaN(quantity)) {
  throw new Error("That is not a number: " + typed);
}
if (quantity <= 0) {
  throw new Error("Quantity must be at least 1.");
}
console.log("Ordering " + quantity + " items.");
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | Converting `typed` to `quantity`, each `throw`, and the final "Ordering..." print |
| **Decision** (diamond) | "Is quantity NaN?" and, only on its `no` branch, "Is quantity <= 0?" — two diamonds |

Each diamond's `yes` branch goes to that check's error message. Each diamond's `no` branch is the only way to reach the *next* step — the second check only happens if the first one passed, and the real order only happens if both did.

### Before you submit

Press **Check my diagram**. It needs at least two diamonds, each with two labelled exits, and every path — including both error paths — reaching the End.
