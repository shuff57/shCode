**Goal:** Fix the same dead-case bug a different way: convert the value instead of rewriting every case.

## Step 1: Convert the value, not the cases

`answer` is still the string `"3"`, and the cases are still plain numbers. This time, `Number(answer)` runs *before* the switch starts comparing, so the value being matched is already a number by the time any `case` looks at it.

```js live plain
let answer = "3";

switch (Number(answer)) {
  case 1:
    console.log("Converted: one.");
    break;
  case 2:
    console.log("Converted: two.");
    break;
  case 3:
    console.log("Converted: three.");
    break;
  default:
    console.log("Converted: not a valid choice.");
}
```

## Step 2: Confirm it still catches invalid input

Change `answer` to `"nine"`. `Number("nine")` is `NaN`, which matches no case, so `default` still runs: the fix doesn't break the fallback.

```js live plain
let answer = "nine";

switch (Number(answer)) {
  case 1:
    console.log("Converted: one.");
    break;
  case 2:
    console.log("Converted: two.");
    break;
  case 3:
    console.log("Converted: three.");
    break;
  default:
    console.log("Converted: not a valid choice.");
}
```

## Key takeaways

- Fix 2 converts the *switched value* once, in the `switch (...)` line, instead of rewriting every case.
- The cases stay as plain numbers, which is often clearer when the numbers have real numeric meaning (like a menu choice).
- Both fixes are correct: pick whichever keeps the case values looking like what they actually mean.
