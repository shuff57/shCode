## The `switch` statement

**Read before `6.6.4 Reading — moSHion docs: switch in draw()`.** About 5 minutes.

By the end of this reading you should be able to answer:

- What goes inside the parentheses of `switch(...)`?
- What keyword marks each branch?
- What does `break` do?

You have seen `if/else` for making decisions. But when you are checking one variable against five different values, `if/else if/else if/else if` gets long fast. `switch` was built for exactly this case — one variable, many possible values, one block per value.

**What you'll learn from it:**

- `switch(expression)` evaluates the expression once, then jumps to the matching `case`.
- Each `case VALUE:` is a label — execution starts there and keeps going until it hits `break`.
- Without `break`, execution "falls through" into the next case (usually a bug, sometimes useful).
- `switch` works with numbers, strings, and booleans.

**Try it:**

```js live
let day = 'Monday';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#282a36');
  fill('#f8f8f2');
  textSize(20);

  switch (day) {
    case 'Monday':
      text('Start of the week', 20, 80);
      break;
    case 'Friday':
      text('Almost the weekend!', 20, 80);
      break;
    case 'Saturday':
    case 'Sunday':
      text('Weekend!', 20, 80);
      break;
  }

  text('Current day: ' + day, 20, 130);
}
```

**What you'll see:** "Start of the week" on one line, "Current day: Monday" below it.

**Try this:** change `let day = 'Monday'` to `'Friday'`, then `'Saturday'`, then `'Sunday'`. For Saturday and Sunday, the output is the same — both labels point to the same code block. Change it to `'Wednesday'` — nothing prints because no case matches.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`switch(expr)`** | Evaluates `expr` and jumps to the `case` whose value matches. |
| **`case VALUE:`** | A label — the entry point when `VALUE` matches the switch expression. |
| **`break`** | Exits the switch immediately. Without it, execution keeps going into the next case. |
| **Fall-through** | When a case has no `break`, execution "falls through" to the code in the next case. |
