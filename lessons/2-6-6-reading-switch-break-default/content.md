## `break` and `default` in `switch`

**Read before `2.6.7 Reading — The state Variable`.** About 5 minutes.

By the end of this reading you should be able to answer:

- What happens when you forget `break`?
- When would you intentionally skip `break`?
- What does `default` catch?

You have written `break` at the end of every case. But what happens if you leave it out? And what if the state variable holds a value none of your cases handle? These two questions lead to two answers: **fall-through** and **default**.

**What you'll learn from it:**

- `break` stops execution and exits the switch. Without it, execution keeps going into the next case.
- Fall-through is usually a bug, but it has one legitimate use: making multiple labels share one block of code.
- `default:` runs when no case matches — it is your safety net for unexpected values.
- Every game state machine should have a `default:` case that resets to a known safe screen.

**Try it — fall-through in action:**

Run this and watch. All three messages print because there are no `break` statements. The switch enters at `case 'A'` and keeps executing straight through to `C`.

```js live
let grade = 'A';

function setup() {
  new Canvas(400, 250);
}

function draw() {
  background('#282a36');
  fill('#f8f8f2');
  textSize(16);

  // BUG: no break statements — everything falls through
  switch (grade) {
    case 'A':
      text('Excellent!', 20, 60);
    case 'B':
      text('Good job!', 20, 90);
    case 'C':
      text('You passed.', 20, 120);
  }
}
```

**Try it — fixed with break:**

Add `break` after each case. Now only "Excellent!" prints. The other two are skipped.

```js live
let grade = 'A';

function setup() {
  new Canvas(400, 250);
}

function draw() {
  background('#282a36');
  fill('#f8f8f2');
  textSize(16);

  switch (grade) {
    case 'A':
      text('Excellent!', 20, 80);
      break;
    case 'B':
      text('Good job!', 20, 80);
      break;
    case 'C':
      text('You passed.', 20, 80);
      break;
  }
}
```

**Try it — the default safety net:**

Set `grade` to `'F'`. None of the cases match, so `default:` catches it.

```js live
let grade = 'F';

function setup() {
  new Canvas(400, 250);
}

function draw() {
  background('#282a36');
  fill('#f8f8f2');
  textSize(16);

  switch (grade) {
    case 'A':
      text('Excellent!', 20, 80);
      break;
    case 'B':
      text('Good job!', 20, 80);
      break;
    case 'C':
      text('You passed.', 20, 80);
      break;
    default:
      fill('#ff5555');
      text('No matching grade found.', 20, 80);
      text('Default case caught it.', 20, 110);
      break;
  }
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`break`** | Exits the switch immediately. Without it, execution falls through to the next case. |
| **Fall-through** | Continuing into the next case because a `break` is missing. |
| **`default:`** | The case that runs when no other case matches. Always last. |
| **Safety net** | A `default:` that resets to a known safe screen — prevents a blank screen when the state variable holds an unexpected value. |
