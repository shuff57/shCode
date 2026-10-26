## Plain English to Pseudocode: Validate Before You Trust

**What you'll practise:**
- Checking the input before doing any work with it
- Ending a bad-input branch with a throw instead of carrying on
- Reaching the real work only when every check passed

### The plan, in plain English

1. Turn the typed text into a number called `quantity`.
2. Check whether `quantity` is not a number. If so, throw an error.
3. Check whether `quantity` is 0 or less. If so, throw an error.
4. Only when both checks passed, print the order.

The chart above the editor shows a different program with the same shape. You do not draw it, you **read** it.

### The code it describes

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

### The thing worth noticing

The checks come **first** and the work comes **last**. A bad value hits a `throw` and the program stops there, so the print is reached only when every check passed. Printing before the checks, or printing a message but not throwing, lets bad input through to the work.

### Before you submit

Press **Grade**, then trace your steps by hand with `"abc"`, `"0"` and `"3"`. Only `"3"` should reach the print.
