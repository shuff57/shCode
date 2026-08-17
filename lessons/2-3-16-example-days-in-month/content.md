**Goal:** Group twelve values into three outcomes — a case where grouping really pays for itself.

## Step 1 — Run it for February

```js live plain
let month = "February";
let days;

switch (month) {
  case "January":
  case "March":
  case "May":
  case "July":
  case "August":
  case "October":
  case "December":
    days = 31;
    break;
  case "April":
  case "June":
  case "September":
  case "November":
    days = 30;
    break;
  case "February":
    days = 28;
    break;
  default:
    days = 0;
    console.log("Not a month.");
}

console.log(month + " has " + days + " days.");
```

## Step 2 — Try a 30-day month and an unknown value

Change `month` to `"April"`, then to something that isn't a month at all, like `"Blorbtember"`. Confirm `days` lands on `30` and then `0`.

```js live plain
let month = "April";
let days;

switch (month) {
  case "January":
  case "March":
  case "May":
  case "July":
  case "August":
  case "October":
  case "December":
    days = 31;
    break;
  case "April":
  case "June":
  case "September":
  case "November":
    days = 30;
    break;
  case "February":
    days = 28;
    break;
  default:
    days = 0;
    console.log("Not a month.");
}

console.log(month + " has " + days + " days.");
```

## Key takeaways

- Twelve `case` values collapse into three groups because only three outcomes exist — 31 days, 30 days, or 28.
- Written as an `else if` chain, this same logic needs eleven `||` operators. The `switch` version reads as a list, not a wall of comparisons.
- Code after the `switch` block (the final `console.log`) runs normally once the block finishes — grouping doesn't change anything about what comes next.
