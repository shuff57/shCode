## Grouping cases

**What you'll learn from it:**
- How to stack `case` labels so several values run the same code
- Why grouped cases are the `switch` version of `||`
- How to tell deliberate grouping apart from an accidental missing `break`

Fall-through is not always a mistake. When several values should produce the *same* result, you can stack their `case` labels with no code between them and let the first ones fall into the last.

```js live plain
let day = "Saturday";

switch (day) {
  case "Saturday":
  case "Sunday":
    console.log("It is the weekend.");
    break;
  default:
    console.log("It is a weekday.");
}
```

`case "Saturday":` has no code of its own, so it falls straight through into `case "Sunday":` and runs its body. Both values reach the same line. You already wrote this same logic with `||` back in Conditionals:

```
if (day === "Saturday" || day === "Sunday") {
  console.log("It is the weekend.");
} else {
  console.log("It is a weekday.");
}
```

Both are correct. Grouped cases are the `switch` spelling of `||`.

**How do you tell "on purpose" from "forgot the break"?** Look at whether there's any code between the stacked labels. `case "Saturday":` immediately followed by `case "Sunday":` reads as intent: nothing was left out, there was never anything there. A case with several lines of code and no `break` reads as an oversight. If you ever *want* to fall through after running code (rarer, and not shown here), say so in a comment: the next person to read it will otherwise assume you forgot.

**Try it:** Change `day` to `"Wednesday"` and confirm it hits `default`.

```js live plain
let day = "Saturday";

switch (day) {
  case "Saturday":
  case "Sunday":
    console.log("It is the weekend.");
    break;
  default:
    console.log("It is a weekday.");
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Grouped cases** | Several `case` labels stacked with no code between them, so they all run the same block |
| **Deliberate fall-through** | Grouping cases on purpose: visible because nothing sits between the stacked labels |
| **Accidental fall-through** | A missing `break` after real code: a bug, not a technique |
