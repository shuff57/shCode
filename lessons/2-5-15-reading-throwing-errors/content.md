## throw

**What you'll learn:**
- Everything so far handled errors JavaScript raised on its own: `throw` lets you raise one deliberately
- `throw` behaves exactly like an error JavaScript raised itself: the rest of `try` is abandoned and `catch` takes over
- `new Error("...")` builds the error value; the text you pass becomes its `message`

"Wrong" is often about your rules, not JavaScript's rules. An age of `-5` breaks nothing in the language: JavaScript is perfectly happy storing a negative number. It is still wrong for a program that means "how old is this person."

```js live plain
const age = -5;

try {
  if (age < 0) {
    throw new Error("Age cannot be negative.");
  }
  console.log("Age accepted: " + age);
} catch (err) {
  console.log("Rejected: " + err.message);
}
```

The `throw` statement raises an error deliberately. Execution stops at that point and jumps to the nearest `catch`, exactly as it would for an error the engine raised on its own. `new Error("Age cannot be negative.")` builds the error value, and the text becomes `err.message`: the same property you already know how to read.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`throw`** | Raises an error deliberately, used when a value breaks the program's rules rather than the language's |
| **`new Error("...")`** | Builds an error value; the text passed in becomes its `message` |
