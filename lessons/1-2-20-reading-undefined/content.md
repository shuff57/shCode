## The value JavaScript supplies when you don't

> **Definition 1.2.6 — undefined.** A special value meaning "value is not assigned". When you declare a variable but do not give it a value, JavaScript automatically sets it to `undefined`.

Note who does the setting. `null` is something *you* write. `undefined` is something *JavaScript* writes, because you did not.

It is technically possible to assign `undefined` yourself, and you should not. Use `null` when you want to say "this is intentionally empty".

The distinction, in one line:

| | Means | Put there by |
|---|---|---|
| `undefined` | "you forgot to give this a value" | JavaScript |
| `null` | "I am deliberately setting this to nothing" | you |

Keeping them apart is what makes a variable holding `undefined` a useful signal rather than noise. If you assign `undefined` by hand, you have thrown away the only difference between "empty on purpose" and "bug".

**What you'll learn from it:**
- A declared-but-unassigned variable holds `undefined` automatically.
- `undefined` is JavaScript's marker; `null` is yours.
- You *can* assign `undefined` yourself — don't. Use `null`.
- Seeing `undefined` in output usually means a value never got set.

**Try it:**

```js live plain
let futureValue;
console.log(futureValue);          // undefined — nobody assigned anything
console.log(typeof futureValue);   // "undefined"

let age = 100;
age = undefined;                   // possible, but don't do this
console.log(age);

let chosenColour = null;           // do this instead
console.log(chosenColour);
```

The first line declares a variable and stops. No value was given, so JavaScript supplied one. That is not an error state — the variable genuinely exists and genuinely holds `undefined`.

Unlike `null`, `typeof undefined` gives the honest answer: `"undefined"`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`undefined`** | The value automatically given to a declared-but-unassigned variable |
| **declared** | The variable exists (`let x;`) |
| **assigned** | The variable has been given a value (`x = 5;`) |
| **`null` vs `undefined`** | Deliberately empty, versus never filled in |
