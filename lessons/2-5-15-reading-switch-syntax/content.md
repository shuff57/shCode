## case, break, and the fall-through trap

Read before `2.5.16 Reading — switch in draw()`. About 5 minutes.

**What you'll learn from it:**

- `switch (value) { case 'a': … break; case 'b': … break; }` picks the branch whose `case` literal matches via strict equality (`===`).
- A missing `break` causes **fall-through** — execution flows into the next case — sometimes intentional, usually a bug.
- An optional `default:` branch runs when no case matches.
- `switch` is cleaner than a long `if / else if` chain when you're dispatching on one value.

**Try it:**

```js live
let mood = 'happy';

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#222');
  fill(255);
  textSize(20);

  switch (mood) {
    case 'happy':
      text('😊 Feeling happy!', 20, 110);
      break;
    case 'sad':
      text('😢 Feeling sad.', 20, 110);
      break;
    default:
      text('🤔 Unknown mood: ' + mood, 20, 110);
  }
}
```

Edit `mood` to `'sad'`, then to `'confused'`, and hit Run each time to see which branch fires. Then delete one `break` and notice fall-through.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`switch`** | JS statement that dispatches on a value's strict equality to `case` labels. |
| **`case`** | One labeled branch inside a `switch` — runs when the value matches. |
| **`break`** | Exits the current `switch` block — required after each case unless intentional fall-through. |
| **Fall-through** | What happens when a `case` is missing its `break` — execution runs into the next case. |
| **`default`** | Optional catch-all branch that runs when no `case` matches. |
