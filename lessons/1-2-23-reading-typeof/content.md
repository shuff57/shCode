## Ask a value what it is

> **Definition 1.2.8 — typeof.** The `typeof` operator returns a **string** naming the type of a value.

Note "returns a string". `typeof 42` does not give you the number type itself — it gives you the six characters `"number"`. That is why you can print it, and why comparing types means comparing two strings.

This is the tool for the problem 1.2.4 raised. In a dynamically typed language a variable's type can change while the program runs, so `typeof` is how you find out what you are actually holding right now rather than what you assumed.

**The `typeof(x)` syntax.** You will see it written both ways:

```js
typeof x
typeof(x)
```

They are the same. `typeof` is an **operator**, not a function — the parentheses are not part of it, they are just grouping, the way they are in maths. Nothing breaks either way; it is worth knowing so the second form does not look like a different tool.

**What you'll learn from it:**
- `typeof` returns a string naming the type.
- Use it to find out what a variable actually holds at this moment.
- `typeof x` and `typeof(x)` are identical — it is an operator, not a function.
- Three of its answers are surprising. Those are 1.2.24.

**Try it:**

```js live plain
console.log(typeof undefined);      // "undefined"
console.log(typeof 0);              // "number"
console.log(typeof 10n);            // "bigint"
console.log(typeof true);           // "boolean"
console.log(typeof "foo");          // "string"

console.log(typeof(42));            // same as typeof 42
console.log(typeof typeof 0);       // "string" — the answer is itself a string
```

That last line is a small joke with a real point. `typeof 0` produces the string `"number"`, and asking the type of *that* gives `"string"` — proving the operator hands back text, not some special type value.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`typeof`** | An operator returning a string that names a value's type |
| **operator** | Built-in syntax like `+` or `typeof` — not a function you call |
| **`typeof(x)`** | The same as `typeof x`; the parentheses are only grouping |
