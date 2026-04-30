## String → object

Read before `2.5.8 Reading — Storing structured data`.

**What you'll learn from it:**

- `JSON.parse(str)` is the inverse of `JSON.stringify` — it reads a JSON-format string and rebuilds the in-memory object.
- The parsed result is a *fresh* object — mutating it has no effect on the original string.
- If the string is malformed (missing quotes, a trailing comma, etc.), `JSON.parse` throws a `SyntaxError`.
- Wrapping the call in `try/catch` protects your code when the source is untrusted.

**Try it:**

```js live
function setup() {
  let s = '{"name":"Ada","score":42}';
  let p = JSON.parse(s);
  console.log(p.score);
  console.log(typeof p.score);
}

function draw() {}
```

Try deliberately breaking the string — remove a quote or add a trailing comma — and see the `SyntaxError` in the console. Then fix it and confirm the score logs as the number `42`, not the string `"42"`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`JSON.parse(str)`** | Converts a JSON-format string back into an in-memory JavaScript object. |
| **Deserialization** | The reverse of serialization — reconstructing a value from its stored format. |
| **`SyntaxError`** | The error thrown by `JSON.parse` when the input string is not valid JSON. |
| **`try/catch`** | A JS block that catches errors so they don't crash your program. |
