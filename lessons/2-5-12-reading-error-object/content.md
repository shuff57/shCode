## err.name and err.message

**What you'll learn:**
- `catch (err)` hands you a value, not just a signal that something failed
- `err.name` — the *kind* of error, like `"ReferenceError"`
- `err.message` — a sentence describing exactly what went wrong

```js live plain
try {
  console.log(nothingHere);
} catch (err) {
  console.log("Kind:    " + err.name);
  console.log("Details: " + err.message);
}
```

`err.name` and `err.message` are read with the same dot notation you already know. `nothingHere is not defined` tells you the exact name JavaScript could not find — which is usually a typo, and usually a typo you would otherwise stare straight past in your own code.

## ReferenceError vs TypeError

**What you'll learn:**
- A **`ReferenceError`** means you named something that does not exist
- A **`TypeError`** means the thing exists but is not the kind of thing you tried to use it as

```js live plain
try {
  const nothing = null;
  console.log(nothing.length);
} catch (err) {
  console.log("Kind:    " + err.name);
  console.log("Details: " + err.message);
}
```

`nothing` exists — it holds `null` — but `null` has no `.length` property to read. That's a different mistake from naming something that was never declared, and JavaScript gives it a different name so you can tell them apart at a glance. Together, `ReferenceError` and `TypeError` cover most of what a beginner runs into.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Error object** | The value handed to `catch`, carrying a `name` and a `message` |
| **`err.name`** | The kind of error, e.g. `"ReferenceError"` |
| **`err.message`** | A sentence describing specifically what went wrong |
| **`ReferenceError`** | Raised when code names something that does not exist |
| **`TypeError`** | Raised when a value exists but isn't the kind of thing the code tried to use it as |
