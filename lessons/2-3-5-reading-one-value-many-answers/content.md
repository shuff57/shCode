## One value, many answers

**What you'll learn from it:**
- How to recognize an `else if` chain that is really one value tested over and over
- Why that repetition is a bug risk, not just a style complaint
- What JavaScript gives you once you notice the pattern

You already know how to chain conditions with `else if`: it works for any conditions at all, which is exactly why it's the tool you reach for first. But look closely at this one:

```
let day = 3;

if (day === 1) {
  console.log("Monday");
} else if (day === 2) {
  console.log("Tuesday");
} else if (day === 3) {
  console.log("Wednesday");
} else if (day === 4) {
  console.log("Thursday");
} else if (day === 5) {
  console.log("Friday");
} else {
  console.log("Weekend");
}
```

The code is correct. It's also repetitive in a specific way: `day` appears six times, and every test asks the same question: *does `day` equal this particular value?* The only thing changing from line to line is the value on the right.

**Six copies of `day ===` is also six chances to mistype the variable name.** A typo like `if (dat === 4)` doesn't crash your program. It just never matches, and Thursday quietly disappears: no error, no warning, just a wrong answer that only shows up when someone happens to test `day = 4`.

**Try it:** Run this, then change `day` to each value from 1 to 6 and confirm it always matches the right line.

```js live plain
let day = 3;

if (day === 1) {
  console.log("Monday");
} else if (day === 2) {
  console.log("Tuesday");
} else if (day === 3) {
  console.log("Wednesday");
} else if (day === 4) {
  console.log("Thursday");
} else if (day === 5) {
  console.log("Friday");
} else {
  console.log("Weekend");
}
```

When a chain of conditions is really one value being compared against a list of possibilities, JavaScript has a statement built for exactly that shape: `switch`. The next reading shows it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`else if` chain** | A sequence of conditions checked in order, one at a time |
| **Repeated comparison** | The same variable compared against a different value on every line of a chain |
| **Silent typo bug** | A misspelled variable name in a condition that never matches and never errors: it just quietly produces the wrong output |
