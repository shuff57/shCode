**Goal:** Write the same dispatch two ways, if/else-if and switch, and see why `break` matters.

## Step 1, if/else-if on a day value

This chain checks `day` and logs a message. It works fine, but adding a third, fourth, or fifth case makes it repetitive.

```js live plain
let day = "Wed";

if (day === "Mon") {
  console.log("Start of the week.");
} else if (day === "Wed") {
  console.log("Middle of the week.");
} else if (day === "Fri") {
  console.log("Almost the weekend!");
} else {
  console.log("Some other day.");
}
```

## Step 2: The same logic as a switch

`switch` compares one value against many cases. Each `case` ends with `break` so JavaScript stops after the match and doesn't run the cases below it.

```js live plain
let day = "Wed";

switch (day) {
  case "Mon":
    console.log("Start of the week.");
    break;
  case "Wed":
    console.log("Middle of the week.");
    break;
  case "Fri":
    console.log("Almost the weekend!");
    break;
  default:
    console.log("Some other day.");
}
```

## Step 3: What happens without break (fall-through)

Remove the `break` after `"Wed"` and run. JavaScript keeps executing the next case's body even though `day` is not `"Fri"`. This is called **fall-through** and is almost always a bug.

```js live plain
let day = "Wed";

switch (day) {
  case "Mon":
    console.log("Start of the week.");
    break;
  case "Wed":
    console.log("Middle of the week.");
    // no break here: fall-through on purpose to see what happens
  case "Fri":
    console.log("Almost the weekend!");
    break;
  default:
    console.log("Some other day.");
}
```

## Key takeaways

- `switch` is cleaner than a long if/else-if chain when you are comparing **one value** against many fixed options.
- Every `case` should end with `break` unless you intentionally want fall-through.
- `default` is the `else` of a switch: it runs when no case matched.
- Both shapes produce the same result; choose the one that reads more clearly.
