## Choosing between if...else and switch

**What you'll learn from it:**
- The one question that tells you which statement fits
- Why some `if...else` chains can never become a `switch`
- That neither statement is "better" — they fit different shapes of problem

Use a **`switch`** when you're comparing **one value** against a **list of specific values**:

```js live plain
let command = "north";

switch (command) {
  case "north":
    console.log("You walk north.");
    break;
  case "south":
    console.log("You walk south.");
    break;
  default:
    console.log("You cannot go that way.");
}
```

Use an **`if...else` chain** when the conditions are ranges, involve more than one variable, or are anything other than a plain equality test:

```js live plain
let score = 87;

if (score >= 90) {
  console.log("A");
} else if (score >= 80) {
  console.log("B");
} else if (score >= 70) {
  console.log("C");
} else {
  console.log("F");
}
```

That grade chain can never become a `switch`, because `score >= 80` is not a value you can list as a `case`. There's no fixed set of numbers to match — there's a boundary.

**The question to ask isn't "which one is cleaner".** It's: **can I write the whole test as a finite list of exact values?** If yes, `switch` says that intent out loud and gets shorter as the list grows. If no — ranges, two variables, `&&`, `||` — it's an `if...else` chain, and forcing a `switch` onto it produces something worse than what you started with.

**Try it:** Change `score` to a few different numbers and confirm the grade chain still works. Then try to imagine writing it as a `switch` — you can't, because "any score 80 or above" isn't a single value.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Finite list of exact values** | The shape `switch` needs — every possibility named as a specific `case` |
| **Range condition** | A test like `score >= 80` that can't be written as a single `case` value |
| **Multi-variable condition** | A test involving more than one variable — always stays an `if...else` chain |
