## Parsing Can Fail

**What you'll learn from it:**
- That `JSON.stringify` always works, but `JSON.parse` can fail
- That malformed text makes `JSON.parse` throw a `SyntaxError`
- That without a `try...catch` the error stops the program
- Why text you loaded is text you did not write, so it belongs in a guard
- That a good `catch` hands back a usable value, not `undefined`

`JSON.stringify` always works, because you start from a real JavaScript value that has nothing about it to be invalid. `JSON.parse` is different: you start from **text**, and text can be anything.

**Try it:** Run the block. The text is not valid JSON, so the parse throws.

```js live plain
try {
  const data = JSON.parse("{ this is not json }");
  console.log(data);
} catch (err) {
  console.log("Could not read the saved data.");
  console.log(err.name);
}
```

You see `SyntaxError`, caught before it could stop the program. Without the `try...catch` from Section 2.5, that error would end the whole run right there.

This is the realistic case, not a contrived one. Saved data gets truncated, edited by hand, written by an older version of your program, or simply is not there yet the first time someone runs it. Every `JSON.parse` of data you did not create in the same breath belongs inside a `try...catch`. The `catch` should return something usable, not nothing:

**Try it:** Run the block. Good data is used; bad data falls back to sensible defaults.

```js live plain
function loadSettings(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return { theme: "light", fontSize: 14 };
  }
}

console.log(loadSettings('{"theme":"dark","fontSize":18}'));
console.log(loadSettings("corrupted!!"));
```

Good data is used; bad data falls back to sensible defaults. The program keeps running either way, which is the whole point of handling an error rather than merely surviving it. A `catch` block that returns `undefined` and hopes for the best is not recovering — it is only postponing the crash.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`SyntaxError`** | The error `JSON.parse` throws when its text is not valid JSON |
| **throw** | How the failure leaves the parse call; uncaught, it stops the program |
| **`try...catch`** | The guard that catches a throw so the program can carry on |
| **fallback** | The usable value the `catch` returns when parsing fails |
| **malformed text** | Text that is not valid JSON — truncated, edited, or simply garbage |
