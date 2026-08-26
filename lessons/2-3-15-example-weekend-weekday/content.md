**Goal:** Confirm that a grouped-case switch and an `||` chain produce identical output, so you can see grouping is a rewrite, not a new idea.

## Step 1: Run the grouped-case version

```js live plain
let day = "Tuesday";

switch (day) {
  case "Saturday":
  case "Sunday":
    console.log("It is the weekend.");
    break;
  default:
    console.log("It is a weekday.");
}
```

## Step 2: Run the equivalent if with ||

Same value, same result: different spelling.

```js live plain
let day = "Tuesday";

if (day === "Saturday" || day === "Sunday") {
  console.log("It is the weekend.");
} else {
  console.log("It is a weekday.");
}
```

## Step 3: Try all seven days on both

Change `day` in Step 1 and Step 2 to each of the seven day names, one at a time. Every single day should agree between the two versions.

## Key takeaways

- Stacking `case "Saturday":` directly above `case "Sunday":` with no code between them means "either value runs this block."
- That's exactly what `day === "Saturday" || day === "Sunday"` says with `||`: same logic, different statement.
- Twelve grouped values (as you'll see next in Days in a Month) would need eleven `||` operators in an `if` chain. Grouping doesn't just match `||`: it scales better as the list grows.
