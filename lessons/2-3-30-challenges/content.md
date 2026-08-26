## Challenge 1: HTTP Status Advisor (easy)

Web servers reply with a numeric status code. Write a `switch` on a variable `code`: `200` prints `OK`, `404` prints `Not Found`, `500` prints `Server Error`, and anything else prints `Unknown status`.

**Hints:**
- This is the exact same shape as the vending machine and drink-size switches: one value, a short list of exact matches.
- Test all four codes, including one that isn't listed.

## Challenge 2: Season from Month (medium)

Write a `switch` on a variable `month` (a number from 1 to 12) that groups the months into four seasons using **grouped cases**, then prints the season name. Pick your own grouping (for example, 12/1/2 as winter).

**Hints:**
- This is Days in a Month's shape, but with four groups instead of three.
- Stack the `case` labels for each season with no code between them, the way the reading showed.

**Stretch it further:** Add a fifth season for a month you pick, and see how the grouping has to change.

## Challenge 3: Find the Fall-Through (medium)

This code should print exactly one line but prints two. Find the missing `break` and fix it: don't change anything else.

```
let size = "small";

switch (size) {
  case "small":
    console.log("Small: $2");
  case "medium":
    console.log("Medium: $3");
  case "large":
    console.log("Large: $4");
    break;
}
```

**Hints:**
- Run it first, read which lines print, and look at the `case` directly above the extra line.
- There's no `default` here on purpose: every value is listed, so match your fix to that.

---

Pick one or more of the three. All three touch different parts of this module: matching one value, grouping several values, and finding a fall-through bug from its symptom.
