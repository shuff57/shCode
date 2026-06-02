## switch statements

**What you'll learn:**
- How a `switch` statement compares one value against many cases
- Why `break` is required at the end of each case
- How `default` acts as the fallback when no case matches
- When to prefer `switch` over a long `if/else if` chain

A `switch` statement takes one value and jumps directly to the matching `case`. It is cleaner than a long `if/else if` chain when you are comparing the **same variable** against many exact values.

```
switch (value) {
  case "A":
    // runs when value === "A"
    break;
  case "B":
    // runs when value === "B"
    break;
  default:
    // runs when nothing matched
}
```

**The `break` matters.** Without it, JavaScript keeps running into the next case even after a match — this is called "fall-through" and is almost always a bug for beginners. Always end each case with `break`.

**Try it:** Change `day` to other values (`"Mon"`, `"Fri"`, `"Sat"`, `"Sun"`, `"xyz"`) and re-run.

```js live console
let day = "Wed";

switch (day) {
  case "Mon":
    console.log("Monday — start of the week.");
    break;
  case "Tue":
    console.log("Tuesday — keep going.");
    break;
  case "Wed":
    console.log("Wednesday — halfway there!");
    break;
  case "Thu":
    console.log("Thursday — almost Friday.");
    break;
  case "Fri":
    console.log("Friday — last day of the school week!");
    break;
  default:
    console.log("Weekend — no school today.");
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`switch`** | Evaluates one expression and jumps to the matching `case` |
| **`case`** | A label that matches a specific value using strict equality (`===`) |
| **`break`** | Exits the `switch` block; without it, execution falls into the next case |
| **`default`** | The fallback block that runs when no `case` matched |
| **fall-through** | What happens when `break` is missing — execution continues into the next case |
