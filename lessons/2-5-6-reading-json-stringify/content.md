## Object → string

Read before `2.5.7 Reading — JSON.parse(str)`.

**What you'll learn from it:**

- `JSON.stringify(obj)` walks every property in an object and produces a text string in JSON format.
- Numbers, strings, booleans, arrays, and nested objects all serialize cleanly.
- Functions and `undefined` do not serialize — they get silently dropped.
- The resulting string is exactly what you'd write to disk or paste into a chat to share data.

**Try it:**

```js live
function setup() {
  let player = { name: 'Ada', score: 42 };
  let serialized = JSON.stringify(player);
  console.log(serialized);
  console.log(typeof serialized);
}

function draw() {}
```

Edit the object's properties — add a `level` field, or change the `score`. Watch the logged string update. Then add a method like `greet() {}` and notice it disappears from the output.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **JSON** | JavaScript Object Notation — a text format for representing structured data. |
| **`JSON.stringify(obj)`** | Converts an in-memory object into a JSON-format string. |
| **Serialization** | The process of converting a value into a format that can be stored or sent. |
| **Property drop** | What happens to functions and `undefined` values during `JSON.stringify` — they are omitted from the result. |
